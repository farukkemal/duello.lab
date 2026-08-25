namespace DuelloLab.Api.Entities;

public class ClanMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClanId { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int UserLevel { get; set; } = 1;
    public ClanRole Role { get; set; } = ClanRole.Member;
    public string Content { get; set; } = string.Empty;
    public bool IsSystem { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Clan Clan { get; set; } = null!;
    public User User { get; set; } = null!;
}
