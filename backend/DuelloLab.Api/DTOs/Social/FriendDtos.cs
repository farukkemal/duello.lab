using System.ComponentModel.DataAnnotations;
using DuelloLab.Api.Entities;

namespace DuelloLab.Api.DTOs.Social;

public class SendFriendRequestDto
{
    [Required]
    public string TargetUsername { get; set; } = string.Empty;
}

public class RespondFriendRequestDto
{
    [Required]
    public Guid FriendshipId { get; set; }

    public bool Accept { get; set; } = true;
}

public class FriendDto
{
    public Guid FriendshipId { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; }
    public int Xp { get; set; }
    public bool IsOnline { get; set; }
    public string? CurrentRoomCode { get; set; }
    public DateTime FriendsSince { get; set; }
}

public class PendingFriendRequestDto
{
    public Guid FriendshipId { get; set; }
    public Guid RequesterId { get; set; }
    public string RequesterUsername { get; set; } = string.Empty;
    public int RequesterLevel { get; set; }
    public DateTime SentAt { get; set; }
}

public class DuelInviteDto
{
    public string InviteId { get; set; } = string.Empty;
    public string FromUserId { get; set; } = string.Empty;
    public string FromUsername { get; set; } = string.Empty;
    public int FromLevel { get; set; } = 1;
    public string Category { get; set; } = "TYT";
    public string RoomCode { get; set; } = string.Empty;
    public string RequesterConnectionId { get; set; } = string.Empty;
}

public class EmoteBroadcastDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string EmoteKey { get; set; } = string.Empty;
    public string Icon { get; set; } = "🔥";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
