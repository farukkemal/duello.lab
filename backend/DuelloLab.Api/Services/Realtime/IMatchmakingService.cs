using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Models.Realtime;

namespace DuelloLab.Api.Services.Realtime;

public class QueuedPlayer
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public string ConnectionId { get; set; } = string.Empty;
    public GameMode Mode { get; set; } = GameMode.Ranked1v1;
    public string Category { get; set; } = "TYT";
    public DateTime EnqueuedAt { get; set; } = DateTime.UtcNow;
}

public interface IMatchmakingService
{
    Task<bool> EnqueueAsync(QueuedPlayer player);
    Task<bool> DequeueAsync(string userId);
    Task<int> GetQueueCountAsync(GameMode mode, string category);
}
