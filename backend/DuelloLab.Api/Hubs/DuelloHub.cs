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
    private readonly IMatchmakingService _matchmakingService;
    private readonly IBattlegroundService _battlegroundService;
    private readonly IBotService _botService;
    private readonly ILogger<DuelloHub> _logger;

    public DuelloHub(
        IRoomStateService roomStateService,
        IRoomService roomService,
        IMatchmakingService matchmakingService,
        IBattlegroundService battlegroundService,
        IBotService botService,
        ILogger<DuelloHub> logger)
    {
        _roomStateService = roomStateService;
        _roomService = roomService;
        _matchmakingService = matchmakingService;
        _battlegroundService = battlegroundService;
        _botService = botService;
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

        // Also remove from matchmaking queue if disconnected
        if (!string.IsNullOrEmpty(userId))
        {
            await _matchmakingService.DequeueAsync(userId);
        }

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

        var stats = await _roomStateService.GetStatsAsync();
        await Clients.All.SendAsync("StatsUpdated", stats);

        await base.OnDisconnectedAsync(exception);
    }

    // Ping / Latency check
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
    }

    public async Task<OnlineStatsDto> GetStats()
    {
        return await _roomStateService.GetStatsAsync();
    }

    // ==========================================
    // MATCHMAKING ACTIONS (NEW GAME MODES)
    // ==========================================

    public async Task JoinMatchmakingQueue(GameMode mode, string category = "TYT")
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Guest";
        int level = 1;

        var player = new QueuedPlayer
        {
            UserId = userId,
            Username = username,
            Level = level,
            ConnectionId = Context.ConnectionId,
            Mode = mode,
            Category = category,
            EnqueuedAt = DateTime.UtcNow
        };

        await _matchmakingService.EnqueueAsync(player);
        var inQueueCount = await _matchmakingService.GetQueueCountAsync(mode, category);

        await Clients.Caller.SendAsync("QueueStatusUpdated", new QueueStatusDto
        {
            Mode = mode,
            InQueueCount = inQueueCount,
            ElapsedSeconds = 0
        });

        _logger.LogInformation("⚡ [Matchmaking] {Username} kuyruğa katıldı (Mod: {Mode}, Kategori: {Cat})", username, mode, category);
    }

    public async Task LeaveMatchmakingQueue()
    {
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        await _matchmakingService.DequeueAsync(userId);
        await Clients.Caller.SendAsync("LeftQueueAck");
        _logger.LogInformation("🚪 [Matchmaking] {UserId} kuyruktan ayrıldı", userId);
    }

    // ==========================================
    // BATTLEGROUND & SUDDEN DEATH ACTIONS
    // ==========================================

    public async Task TriggerZonePhase(string roomCode, int currentQuestionIndex)
    {
        var code = roomCode.ToUpper().Trim();
        var zoneResult = await _battlegroundService.ProcessZoneShrinkAsync(code, currentQuestionIndex);

        if (zoneResult != null)
        {
            _logger.LogInformation("⚠️ [Battleground] Alan daraldı ({RoomCode}): {Message}", code, zoneResult.Message);
            await Clients.Group(code).SendAsync("ZoneShrunk", zoneResult);
        }
    }

    public async Task SubmitSuddenDeathAnswer(string roomCode, string questionId, string? selectedChoice)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = GetUserId();
        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Oyuncu";

        bool isEliminated = await _battlegroundService.ProcessSuddenDeathAnswerAsync(code, userId.ToString(), questionId, selectedChoice);

        if (isEliminated)
        {
            _logger.LogInformation("💀 [SuddenDeath] Oyuncu elendi: {Username} ({UserId})", username, userId);
            await Clients.Group(code).SendAsync("PlayerEliminated", new PlayerEliminatedDto
            {
                UserId = userId.ToString(),
                Username = username,
                QuestionIndex = 0,
                Reason = "Yanlış Cevap Vererek Elendi 💀"
            });
        }
    }

    // ==========================================
    // SOCIAL & DUEL INVITATIONS & EMOTES
    // ==========================================

    public async Task SendDuelInvite(string targetUserId, string category = "TYT")
    {
        var fromUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var fromUsername = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Arkadaşın";

        var targetConns = await _roomStateService.GetConnectionsByUserIdAsync(targetUserId);
        if (targetConns.Count == 0)
        {
            await Clients.Caller.SendAsync("DuelInviteError", "Arkadaşınız şu anda çevrimdışı.");
            return;
        }

        var roomRes = await _roomService.CreateRoomAsync(Guid.Parse(fromUserId), new CreateRoomDto
        {
            Title = $"1v1 Düello: {fromUsername}",
            Category = category,
            QuestionCount = 3,
            Mode = GameMode.Ranked1v1
        });

        var roomCode = roomRes.RoomCode;
        var inviteId = Guid.NewGuid().ToString();

        var inviteData = new
        {
            inviteId,
            fromUserId,
            fromUsername,
            fromLevel = 1,
            category,
            roomCode,
            requesterConnectionId = Context.ConnectionId
        };

        foreach (var connId in targetConns)
        {
            await Clients.Client(connId).SendAsync("DuelInviteReceived", inviteData);
        }

        _logger.LogInformation("🤝 [DuelInvite] {From} -> {Target} (Room: {RoomCode})", fromUsername, targetUserId, roomCode);
    }

    public async Task RespondDuelInvite(string inviteId, bool accept, string roomCode, string requesterConnectionId)
    {
        var targetUsername = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Arkadaşın";

        if (accept)
        {
            if (!string.IsNullOrEmpty(requesterConnectionId))
            {
                await Clients.Client(requesterConnectionId).SendAsync("DuelInviteAccepted", new { roomCode, opponentUsername = targetUsername });
            }
            await Clients.Caller.SendAsync("DuelInviteAccepted", new { roomCode, opponentUsername = targetUsername });
        }
        else
        {
            if (!string.IsNullOrEmpty(requesterConnectionId))
            {
                await Clients.Client(requesterConnectionId).SendAsync("DuelInviteDeclined", new { targetUsername });
            }
        }
    }

    public async Task SendEmote(string roomCode, string emoteKey)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var username = Context.User?.FindFirst(ClaimTypes.Name)?.Value ?? "Oyuncu";

        string icon = emoteKey switch
        {
            "fire" => "🔥",
            "shock" => "🤯",
            "crown" => "👑",
            "skull" => "💀",
            "bullseye" => "🎯",
            "crying" => "😭",
            "cool" => "😎",
            "celebrate" => "🎉",
            _ => "🔥"
        };

        var emoteData = new
        {
            userId,
            username,
            emoteKey,
            icon,
            timestamp = DateTime.UtcNow
        };

        _logger.LogInformation("💬 [Emote] {Username} in {RoomCode} sent {Icon}", username, code, icon);
        await Clients.Group(code).SendAsync("EmoteReceived", emoteData);
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
                IsReady = room.HostUserId == userId || room.Mode == GameMode.Ranked1v1,
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
    // GAMEPLAY & LIVE PROGRESS
    // ==========================================

    public async Task StartMatch(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        var userId = GetUserId();

        try
        {
            var room = await _roomStateService.GetRoomAsync(code);
            MatchStartingDto matchStarting;

            if (room?.Mode == GameMode.Battleground100)
            {
                matchStarting = await _battlegroundService.StartBattlegroundMatchAsync(code);
            }
            else
            {
                matchStarting = await _roomService.StartMatchAsync(userId, code);
            }

            _logger.LogInformation("⚔️ [SignalR] Match starting in Lobby {RoomCode} by Host {UserId}. Mode: {Mode}", code, userId, matchStarting.Mode);

            // Broadcast MatchStarting with 3-2-1 countdown timestamp to all participants
            await Clients.Group(code).SendAsync("MatchStarting", matchStarting);

            // Bot simülasyonu — odada bot varsa başlat
            var updatedRoom = await _roomStateService.GetRoomAsync(code);
            if (updatedRoom != null)
            {
                var botConfigs = updatedRoom.Users.Values
                    .Where(u => u.IsBot)
                    .Select(u => BotDifficultyConfig.Get(u.BotDifficulty))
                    .Select((cfg, _) =>
                    {
                        // BotId'yi gerçek room user'daki userId ile eşitle
                        var roomBot = updatedRoom.Users.Values.FirstOrDefault(u => u.IsBot && u.BotDifficulty == cfg.Difficulty);
                        if (roomBot != null) cfg.BotId = roomBot.UserId;
                        return cfg;
                    })
                    .ToList();

                if (botConfigs.Count > 0)
                {
                    _ = _botService.SimulateBotMatchAsync(code, botConfigs);
                    _logger.LogInformation("🤖 Bot simülasyonu başlatıldı: {Count} bot | Oda: {Code}", botConfigs.Count, code);
                }
            }
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

            // Check if Battleground safe zone shrink should trigger (every 3 questions)
            var room = await _roomStateService.GetRoomAsync(code);
            if (room?.Mode == GameMode.Battleground100 && (currentQuestionIndex + 1) % 3 == 0)
            {
                var zoneResult = await _battlegroundService.ProcessZoneShrinkAsync(code, currentQuestionIndex);
                if (zoneResult != null)
                {
                    await Clients.Group(code).SendAsync("ZoneShrunk", zoneResult);
                }
            }

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

            // Notify players that this user finished
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
            _logger.LogWarning(ex, "ForceTimeUp rejected for room {RoomCode}", code);
            throw new HubException(ex.Message);
        }
    }

    public async Task<MatchEndedDto> GetLeaderboard(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        return await _roomService.GetRoomLeaderboardAsync(code);
    }
}
