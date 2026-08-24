using System.ComponentModel.DataAnnotations;
using DuelloLab.Api.Entities;

namespace DuelloLab.Api.DTOs.Social;

public class CreateClanDto
{
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(6)]
    public string Tag { get; set; } = "YKS";

    public string BadgeIcon { get; set; } = "🛡️";

    public int MinLevel { get; set; } = 1;

    public bool IsOpen { get; set; } = true;
}

public class ClanMemberDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; }
    public int XpContributed { get; set; }
    public ClanRole Role { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class ClanDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string BadgeIcon { get; set; } = "🛡️";
    public int MinLevel { get; set; }
    public bool IsOpen { get; set; }
    public Guid LeaderUserId { get; set; }
    public string LeaderUsername { get; set; } = string.Empty;
    public int TotalXp { get; set; }
    public int MemberCount { get; set; }
    public int Rank { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ClanMemberDto> Members { get; set; } = new();
}

public class ClanListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
    public string BadgeIcon { get; set; } = "🛡️";
    public int MinLevel { get; set; }
    public bool IsOpen { get; set; }
    public int TotalXp { get; set; }
    public int MemberCount { get; set; }
    public int Rank { get; set; }
}
