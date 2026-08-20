using DuelloLab.Api.Models.Realtime;

namespace DuelloLab.Api.Services.Realtime;

public interface IRoomStateService
{
    bool IsRedisConnected { get; }

    // Connection tracking
    Task AddUserConnectionAsync(string connectionId, string userId, string username);
    Task<string?> RemoveUserConnectionAsync(string connectionId);
    Task<string?> GetUserIdByConnectionAsync(string connectionId);
    Task<List<string>> GetConnectionsByUserIdAsync(string userId);
    Task<OnlineStatsDto> GetStatsAsync();

    // User-Room mapping
    Task SetUserRoomAsync(string userId, string roomCode);
    Task<string?> GetUserRoomAsync(string userId);
    Task RemoveUserRoomAsync(string userId);

    // Room management
    Task<bool> CreateRoomAsync(RoomState room);
    Task<RoomState?> GetRoomAsync(string roomCode);
    Task<bool> JoinRoomAsync(string roomCode, RoomUserInfo user);
    Task<(bool success, RoomState? updatedRoom)> LeaveRoomAsync(string roomCode, string userId);
    Task<(bool success, RoomState? updatedRoom)> SetUserReadyAsync(string roomCode, string userId, bool isReady);
    Task<List<RoomState>> GetActiveRoomsAsync();
    Task<bool> DeleteRoomAsync(string roomCode);
}
