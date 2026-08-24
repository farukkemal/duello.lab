namespace DuelloLab.Api.Entities;

public class Clan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty; // e.g. "FEN", "YKS", "MEZUN"
    public string BadgeIcon { get; set; } = "🛡️"; // "🛡️", "🔥", "⚡", "👑", "🦅"
    public int MinLevel { get; set; } = 1;
    public bool IsOpen { get; set; } = true;
    public Guid LeaderUserId { get; set; }
    public string LeaderUsername { get; set; } = string.Empty;
    public int TotalXp { get; set; } = 0;
    public int MemberCount { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ClanMember> Members { get; set; } = new List<ClanMember>();
}
