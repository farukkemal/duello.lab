using DuelloLab.Api.DTOs.Analytics;

namespace DuelloLab.Api.DTOs.Auth;

public class UserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Level { get; set; }
    public int XP { get; set; }
    public int CoinBalance { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Role { get; set; } = "User";
    public bool IsBanned { get; set; }
    public string Avatar { get; set; } = "default";
    public string Title { get; set; } = "Savaşçı";
    public string Bio { get; set; } = string.Empty;
    public string? ClanName { get; set; }
    public string? ClanTag { get; set; }
    public int JokerEliminateThree { get; set; }
    public int JokerDoubleChance { get; set; }
    public int JokerExtraTime { get; set; }
}

public class PublicProfileDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Avatar { get; set; } = "default";
    public string Title { get; set; } = "Savaşçı";
    public string Bio { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public int XP { get; set; } = 0;
    public DateTime CreatedAt { get; set; }

    // Clan Info
    public Guid? ClanId { get; set; }
    public string? ClanName { get; set; }
    public string? ClanTag { get; set; }
    public string? ClanRole { get; set; }
    public string? ClanBadge { get; set; }

    // Performance & Analytics Summary
    public int TotalExamsTaken { get; set; }
    public int TotalQuestionsSolved { get; set; }
    public decimal OverallAccuracyRate { get; set; }
    public decimal AverageNetScore { get; set; }
    public string StrongestBranch { get; set; } = string.Empty;
    public string WeakestBranch { get; set; } = string.Empty;

    // Branch Heatmap List
    public List<BranchPerformanceDto> BranchHeatmap { get; set; } = new();
}

public class UpdateProfileDto
{
    public string? Avatar { get; set; }
    public string? Title { get; set; }
    public string? Bio { get; set; }
}
