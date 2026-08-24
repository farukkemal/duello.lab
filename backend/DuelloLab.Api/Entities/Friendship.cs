namespace DuelloLab.Api.Entities;

public enum FriendshipStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Blocked = 3
}

public class Friendship
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public User Requester { get; set; } = null!;
    public User Addressee { get; set; } = null!;
}
