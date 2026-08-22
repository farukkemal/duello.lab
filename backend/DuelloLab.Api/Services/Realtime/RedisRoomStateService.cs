using System.Collections.Concurrent;
using System.Text.Json;
using DuelloLab.Api.Models.Realtime;
using StackExchange.Redis;

namespace DuelloLab.Api.Services.Realtime;

public class RedisRoomStateService : IRoomStateService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisRoomStateService> _logger;
    private readonly IDatabase? _db;

    // In-memory fallback stores
    private readonly ConcurrentDictionary<string, string> _connectionToUser = new();
    private readonly ConcurrentDictionary<string, string> _connectionToUsername = new();
    private readonly ConcurrentDictionary<string, ConcurrentBag<string>> _userToConnections = new();
    private readonly ConcurrentDictionary<string, string> _userToRoom = new();
    private readonly ConcurrentDictionary<string, RoomState> _rooms = new();

    private const string KeyActiveRooms = "duello:rooms:active";
    private const string KeyRoomPrefix = "duello:room:";
    private const string KeyConnPrefix = "duello:conn:";
    private const string KeyUserConnPrefix = "duello:user_conns:";
    private const string KeyUserRoomPrefix = "duello:user_room:";

    public RedisRoomStateService(IConnectionMultiplexer? redis, ILogger<RedisRoomStateService> logger)
    {
        _redis = redis;
        _logger = logger;

        if (_redis != null && _redis.IsConnected)
        {
            try
            {
                _db = _redis.GetDatabase();
                _logger.LogInformation("🚀 [RedisRoomStateService] Connected to Redis successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ [RedisRoomStateService] Failed to acquire Redis database. Using In-Memory Fallback.");
                _db = null;
            }
        }
        else
        {
            _logger.LogInformation("ℹ️ [RedisRoomStateService] Redis not available. Operating in In-Memory Fallback mode.");
            _db = null;
        }
    }

    public bool IsRedisConnected => _redis != null && _redis.IsConnected && _db != null;

    public async Task AddUserConnectionAsync(string connectionId, string userId, string username)
    {
        _connectionToUser[connectionId] = userId;
        _connectionToUsername[connectionId] = username;
        _userToConnections.AddOrUpdate(
            userId,
            _ => new ConcurrentBag<string> { connectionId },
            (_, bag) => { bag.Add(connectionId); return bag; });

        if (IsRedisConnected && _db != null)
        {
            try
            {
                var connData = JsonSerializer.Serialize(new { userId, username, connectedAt = DateTime.UtcNow });
                await _db.StringSetAsync($"{KeyConnPrefix}{connectionId}", connData, TimeSpan.FromHours(24));
                await _db.SetAddAsync($"{KeyUserConnPrefix}{userId}", connectionId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for AddUserConnectionAsync.");
            }
        }
    }

    public async Task<string?> RemoveUserConnectionAsync(string connectionId)
    {
        _connectionToUser.TryRemove(connectionId, out var userId);
        _connectionToUsername.TryRemove(connectionId, out _);

        if (userId != null && _userToConnections.TryGetValue(userId, out var bag))
        {
            var remaining = bag.Where(c => c != connectionId).ToList();
            var newBag = new ConcurrentBag<string>(remaining);
            _userToConnections.TryUpdate(userId, newBag, bag);
        }

        if (IsRedisConnected && _db != null)
        {
            try
            {
                await _db.KeyDeleteAsync($"{KeyConnPrefix}{connectionId}");
                if (userId != null)
                {
                    await _db.SetRemoveAsync($"{KeyUserConnPrefix}{userId}", connectionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for RemoveUserConnectionAsync.");
            }
        }

        return userId;
    }

    public async Task<string?> GetUserIdByConnectionAsync(string connectionId)
    {
        if (IsRedisConnected && _db != null)
        {
            try
            {
                var val = await _db.StringGetAsync($"{KeyConnPrefix}{connectionId}");
                if (val.HasValue)
                {
                    using var doc = JsonDocument.Parse(val.ToString());
                    if (doc.RootElement.TryGetProperty("userId", out var uProp))
                        return uProp.GetString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for GetUserIdByConnectionAsync.");
            }
        }

        _connectionToUser.TryGetValue(connectionId, out var userId);
        return userId;
    }

    public async Task<List<string>> GetConnectionsByUserIdAsync(string userId)
    {
        if (IsRedisConnected && _db != null)
        {
            try
            {
                var members = await _db.SetMembersAsync($"{KeyUserConnPrefix}{userId}");
                if (members.Length > 0)
                {
                    return members.Select(m => m.ToString()).ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for GetConnectionsByUserIdAsync.");
            }
        }

        if (_userToConnections.TryGetValue(userId, out var bag))
        {
            return bag.Distinct().ToList();
        }

        return new List<string>();
    }

    public async Task SetUserRoomAsync(string userId, string roomCode)
    {
        _userToRoom[userId] = roomCode;
        if (IsRedisConnected && _db != null)
        {
            try
            {
                await _db.StringSetAsync($"{KeyUserRoomPrefix}{userId}", roomCode, TimeSpan.FromHours(4));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for SetUserRoomAsync.");
            }
        }
    }

    public async Task<string?> GetUserRoomAsync(string userId)
    {
        if (IsRedisConnected && _db != null)
        {
            try
            {
                var val = await _db.StringGetAsync($"{KeyUserRoomPrefix}{userId}");
                if (val.HasValue) return val.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for GetUserRoomAsync.");
            }
        }

        _userToRoom.TryGetValue(userId, out var roomCode);
        return roomCode;
    }

    public async Task RemoveUserRoomAsync(string userId)
    {
        _userToRoom.TryRemove(userId, out _);
        if (IsRedisConnected && _db != null)
        {
            try
            {
                await _db.KeyDeleteAsync($"{KeyUserRoomPrefix}{userId}");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis delete failed for RemoveUserRoomAsync.");
            }
        }
    }

    public async Task<OnlineStatsDto> GetStatsAsync()
    {
        int connectedClients = _connectionToUser.Count;
        int onlineUsers = _userToConnections.Count(kv => kv.Value.Any());
        int activeRooms = _rooms.Count;

        if (IsRedisConnected && _db != null)
        {
            try
            {
                var roomCount = (int)await _db.SetLengthAsync(KeyActiveRooms);
                activeRooms = roomCount;
            }
            catch { }
        }

        return new OnlineStatsDto
        {
            ConnectedClientsCount = connectedClients,
            OnlineUsersCount = onlineUsers,
            ActiveRoomsCount = activeRooms,
            IsRedisActive = IsRedisConnected,
            ServerTime = DateTime.UtcNow
        };
    }

    public async Task<bool> CreateRoomAsync(RoomState room)
    {
        _rooms[room.RoomCode] = room;

        if (IsRedisConnected && _db != null)
        {
            try
            {
                var json = JsonSerializer.Serialize(room);
                await _db.StringSetAsync($"{KeyRoomPrefix}{room.RoomCode}", json, TimeSpan.FromHours(4));
                await _db.SetAddAsync(KeyActiveRooms, room.RoomCode);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for CreateRoomAsync.");
            }
        }

        return true;
    }

    public async Task<RoomState?> GetRoomAsync(string roomCode)
    {
        if (IsRedisConnected && _db != null)
        {
            try
            {
                var val = await _db.StringGetAsync($"{KeyRoomPrefix}{roomCode.ToUpper()}");
                if (val.HasValue)
                {
                    return JsonSerializer.Deserialize<RoomState>(val.ToString());
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for GetRoomAsync.");
            }
        }

        _rooms.TryGetValue(roomCode.ToUpper(), out var room);
        return room;
    }

    public async Task<bool> JoinRoomAsync(string roomCode, RoomUserInfo user)
    {
        var room = await GetRoomAsync(roomCode);
        if (room == null || room.Status != RoomStatus.Waiting)
            return false;

        room.Users[user.UserId] = user;
        await SetUserRoomAsync(user.UserId, roomCode);
        return await CreateRoomAsync(room);
    }

    public async Task<(bool success, RoomState? updatedRoom)> LeaveRoomAsync(
    string roomCode,
    string userId)
    {
        var code = roomCode.ToUpper().Trim();

        var room = await GetRoomAsync(code);
        if (room == null)
            return (false, null);

        var hostLeft = room.HostUserId == userId;

        room.Users.Remove(userId);
        await RemoveUserRoomAsync(userId);

        // Host ayrılırsa veya odada kimse kalmazsa oda tamamen kapanır.
        if (hostLeft || room.Users.Count == 0)
        {
            // Kalan kullanıcıların oda eşleşmelerini de temizle.
            foreach (var remainingUserId in room.Users.Keys)
            {
                await RemoveUserRoomAsync(remainingUserId);
            }

            await DeleteRoomAsync(code);
            return (true, null);
        }

        // Host dışındaki bir oyuncu ayrıldı; oda yaşamaya devam eder.
        await CreateRoomAsync(room);
        return (true, room);
    }



    public async Task<(bool success, RoomState? updatedRoom)> SetUserReadyAsync(string roomCode, string userId, bool isReady)
    {
        var room = await GetRoomAsync(roomCode);
        if (room == null) return (false, null);

        if (room.Users.TryGetValue(userId, out var user))
        {
            user.IsReady = isReady;
            await CreateRoomAsync(room);
            return (true, room);
        }

        return (false, null);
    }

    public async Task<List<RoomState>> GetActiveRoomsAsync()
    {
        if (IsRedisConnected && _db != null)
        {
            try
            {
                var codes = await _db.SetMembersAsync(KeyActiveRooms);
                var list = new List<RoomState>();
                foreach (var code in codes)
                {
                    var r = await GetRoomAsync(code.ToString());
                    if (r != null) list.Add(r);
                }
                return list;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis read failed for GetActiveRoomsAsync.");
            }
        }

        return _rooms.Values.ToList();
    }

    public async Task<bool> DeleteRoomAsync(string roomCode)
    {
        _rooms.TryRemove(roomCode.ToUpper(), out _);

        if (IsRedisConnected && _db != null)
        {
            try
            {
                await _db.KeyDeleteAsync($"{KeyRoomPrefix}{roomCode.ToUpper()}");
                await _db.SetRemoveAsync(KeyActiveRooms, roomCode.ToUpper());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis write failed for DeleteRoomAsync.");
            }
        }

        return true;
    }
}
