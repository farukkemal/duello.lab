using System.Security.Claims;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Models.Realtime;
using DuelloLab.Api.Services.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace DuelloLab.Api.Hubs;

[Authorize]
public class DuelloHub : Hub
{
    private readonly IRoomStateService _roomStateService;
    private readonly IRoomService _roomService;
    private readonly ILogger<DuelloHub> _logger;

    public DuelloHub(
        IRoomStateService roomStateService,
        IRoomService roomService,
        ILogger<DuelloHub> logger)
    {
        _roomStateService = roomStateService;
        _roomService = roomService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? Context.UserIdentifier
            ?? "anonymous";

        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value
            ?? Context.User?.Identity?.Name
            ?? "Guest";

        _logger.LogInformation("🔌 [SignalR] Client Connected: ConnectionId={ConnectionId}, UserId={UserId}, Username={Username}",
            Context.ConnectionId, userId, username);

        await _roomStateService.AddUserConnectionAsync(Context.ConnectionId, userId, username);

        // Send connection acknowledgment to the caller
        await Clients.Caller.SendAsync("ConnectedAck", new
        {
            connectionId = Context.ConnectionId,
            userId,
            username,
            isRedisActive = _roomStateService.IsRedisConnected,
            serverTime = DateTime.UtcNow
        });

        // Broadcast stats update
        var stats = await _roomStateService.GetStatsAsync();
        await Clients.All.SendAsync("StatsUpdated", stats);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = await _roomStateService.RemoveUserConnectionAsync(Context.ConnectionId);

        if (exception != null)
        {
            _logger.LogWarning("❌ [SignalR] Client Disconnected with Error: ConnectionId={ConnectionId}, UserId={UserId}, Error={Error}",
                Context.ConnectionId, userId, exception.Message);
        }
        else
        {
            _logger.LogInformation("🔌 [SignalR] Client Disconnected: ConnectionId={ConnectionId}, UserId={UserId}",
                Context.ConnectionId, userId);
        }

        // Check if user was in a room and clean up
        if (!string.IsNullOrEmpty(userId))
        {
            var userConns = await _roomStateService.GetConnectionsByUserIdAsync(userId);
            if (userConns.Count == 0)
            {
                var activeRoomCode = await _roomStateService.GetUserRoomAsync(userId);
                if (!string.IsNullOrEmpty(activeRoomCode))
                {
                    var (success, updatedRoom) = await _roomStateService.LeaveRoomAsync(activeRoomCode, userId);
                    if (success)
                    {
                        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Bir oyuncu";
                        await Clients.Group(activeRoomCode.ToUpper()).SendAsync("UserLeftLobby", new
                        {
                            userId,
                            username,
                            room = updatedRoom
                        });
                        _logger.LogInformation("🚪 [SignalR] User {UserId} auto-removed from Lobby {RoomCode} on disconnect.", userId, activeRoomCode);
                    }
                }
            }
        }

        // Broadcast stats update
        var stats = await _roomStateService.GetStatsAsync();
        await Clients.All.SendAsync("StatsUpdated", stats);

        await base.OnDisconnectedAsync(exception);
    }

    // Ping / Latency check
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
    }

    // Get current online & room stats
    public async Task<OnlineStatsDto> GetStats()
    {
        return await _roomStateService.GetStatsAsync();
    }

    // ==========================================
    // LOBBY SIGNALR ACTIONS (FAZ 2.2)
    // ==========================================

    public async Task JoinLobby(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Guest";

        var room = await _roomStateService.GetRoomAsync(code);
        if (room == null)
        {
            await Clients.Caller.SendAsync("LobbyError", "Oda bulunamadı veya süresi dolmuş.");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        if (!room.Users.ContainsKey(userId))
        {
            var roomUser = new RoomUserInfo
            {
                UserId = userId,
                Username = username,
                ConnectionId = Context.ConnectionId,
                IsHost = room.HostUserId == userId,
                IsReady = room.HostUserId == userId,
                JoinedAt = DateTime.UtcNow
            };
            await _roomStateService.JoinRoomAsync(code, roomUser);
            room.Users[userId] = roomUser;
        }
        else
        {
            room.Users[userId].ConnectionId = Context.ConnectionId;
            await _roomStateService.CreateRoomAsync(room);
        }

        await _roomStateService.SetUserRoomAsync(userId, code);

        // Send current room state to caller
        await Clients.Caller.SendAsync("LobbyState", room);

        // Broadcast user joined to other members in the room
        var joinedUser = room.Users[userId];
        await Clients.OthersInGroup(code).SendAsync("UserJoinedLobby", new
        {
            user = joinedUser,
            room
        });

        var stats = await _roomStateService.GetStatsAsync();
        await Clients.All.SendAsync("StatsUpdated", stats);

        _logger.LogInformation("👥 [SignalR] User {Username} ({UserId}) joined Lobby {RoomCode}", username, userId, code);
    }

    public async Task LeaveLobby(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Guest";

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, code);

        var (success, updatedRoom) = await _roomStateService.LeaveRoomAsync(code, userId);

        if (success)
        {
            await Clients.Group(code).SendAsync("UserLeftLobby", new
            {
                userId,
                username,
                room = updatedRoom
            });

            await Clients.Caller.SendAsync("LeftLobbyAck");

            var stats = await _roomStateService.GetStatsAsync();
            await Clients.All.SendAsync("StatsUpdated", stats);

            _logger.LogInformation("🚪 [SignalR] User {Username} ({UserId}) left Lobby {RoomCode}", username, userId, code);
        }
    }

    public async Task ToggleReady(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;

        var room = await _roomStateService.GetRoomAsync(code);
        if (room == null || !room.Users.TryGetValue(userId, out var user))
            return;

        if (room.HostUserId == userId)
            return;

        var newReadyState = !user.IsReady;
        var (success, updatedRoom) = await _roomStateService.SetUserReadyAsync(code, userId, newReadyState);

        if (success && updatedRoom != null)
        {
            await Clients.Group(code).SendAsync("UserReadyChanged", new
            {
                userId,
                isReady = newReadyState,
                room = updatedRoom
            });

            _logger.LogInformation("✅ [SignalR] User {UserId} ready state changed to {IsReady} in Lobby {RoomCode}", userId, newReadyState, code);
        }
    }

    // ==========================================
    // GAMEPLAY & LIVE PROGRESS (FAZ 2.3 & FAZ 2.4)
    // ==========================================

    public async Task StartMatch(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = GetUserId();

        try
        {
            var matchStarting = await _roomService.StartMatchAsync(userId, code);

            _logger.LogInformation("⚔️ [SignalR] Match starting in Lobby {RoomCode} by Host {UserId}. 3-2-1 Countdown initiated.", code, userId);

            // Broadcast MatchStarting with 3-2-1 countdown timestamp to all participants
            await Clients.Group(code).SendAsync("MatchStarting", matchStarting);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to start match in Lobby {RoomCode}", code);
            await Clients.Caller.SendAsync("LobbyError", ex.Message);
        }
    }

    public async Task UpdateProgress(
        string roomCode,
        int currentQuestionIndex,
        int answeredCount,
        Guid? questionId = null,
        string? selectedChoice = null)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = GetUserId();

        try
        {
            var progress = await _roomService.UpdateProgressAsync(
                userId,
                code,
                currentQuestionIndex,
                answeredCount,
                questionId,
                selectedChoice);

            // Broadcast real-time progress update to all participants in the match
            await Clients.Group(code).SendAsync("PlayerProgressUpdated", progress);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update progress for user {UserId} in {RoomCode}", userId, code);
        }
    }

    public async Task SubmitMatch(string roomCode, List<AnswerDto> answers)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = GetUserId();

        try
        {
            var (playerResult, matchEnded) = await _roomService.SubmitMatchAsync(userId, code, answers);

            _logger.LogInformation("🏁 [SignalR] User {UserId} finished match in {RoomCode}. NetScore={NetScore}, Duration={DurationMs}ms, Rank=#{Rank}",
                userId, code, playerResult.NetScore, playerResult.DurationMs, playerResult.Rank);

            // // Notify players that this user finished without revealing the result
            await Clients.Group(code).SendAsync("PlayerFinished", new
            {
                playerResult.UserId,
                playerResult.Username,
                IsFinished = true
            });

            // If everyone is finished, broadcast the full match leaderboard with podium details
            if (matchEnded != null)
            {
                _logger.LogInformation("🏆 [SignalR] All players finished in {RoomCode}. Match ended with podium & reward distribution!", code);
                await Clients.Group(code).SendAsync("MatchEnded", matchEnded);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit match for user {UserId} in {RoomCode}", userId, code);
            await Clients.Caller.SendAsync("LobbyError", ex.Message);
        }
    }

    // Force Finish when time limit is reached
    public async Task ForceTimeUp(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();

        try
        {
            _logger.LogInformation("⏰ [SignalR] Match time expired for Lobby {RoomCode}. Calculating podium & rewards...", code);
            var matchEnded = await _roomService.ForceTimeUpAsync(code);
            await Clients.Group(code).SendAsync("MatchEnded", matchEnded);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "ForceTimeUp rejected for room {RoomCode}",
                code);

            throw new HubException(ex.Message);
        }
    }

    public async Task<MatchEndedDto> GetLeaderboard(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        return await _roomService.GetRoomLeaderboardAsync(code);
    }
}
