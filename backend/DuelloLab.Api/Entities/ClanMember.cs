namespace DuelloLab.Api.Entities;

public enum ClanRole
{
    Member = 0,
    Elder = 1,
    Leader = 2
}

public class ClanMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClanId { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public int XpContributed { get; set; } = 0;
    public ClanRole Role { get; set; } = ClanRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Clan Clan { get; set; } = null!;
    public User User { get; set; } = null!;
}
