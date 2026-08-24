namespace DuelloLab.Api.DTOs.Admin;

// ---------- Stats ----------
public class AdminStatsDto
{
    public int TotalUsers { get; set; }
    public int TotalQuestions { get; set; }
    public int ActiveRooms { get; set; }
    public long TotalCoinsInCirculation { get; set; }
    public int TotalExams { get; set; }
    public int BannedUsers { get; set; }
}

// ---------- User management ----------
public class AdminUserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Level { get; set; }
    public int XP { get; set; }
    public int CoinBalance { get; set; }
    public string Role { get; set; } = "User";
    public bool IsBanned { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminUpdateEconomyDto
{
    public int DeltaXP { get; set; }
    public int DeltaCoin { get; set; }
    public int? SetLevel { get; set; }
}

public class AdminUpdateRoleDto
{
    public string Role { get; set; } = "User";
}

public class AdminBanDto
{
    public bool IsBanned { get; set; }
}

// ---------- Question management ----------
public class AdminQuestionDto
{
    public Guid Id { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public Dictionary<string, string> Choices { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public string PoolType { get; set; } = "Solo";
}

public class AdminCreateQuestionDto
{
    public Guid ExamId { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public Dictionary<string, string> Choices { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public string PoolType { get; set; } = "Solo";
}

public class AdminUpdateQuestionDto
{
    public string? Branch { get; set; }
    public string? QuestionText { get; set; }
    public Dictionary<string, string>? Choices { get; set; }
    public string? CorrectAnswer { get; set; }
    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public string? PoolType { get; set; }
}

// ---------- Room management ----------
public class AdminRoomDto
{
    public string Code { get; set; } = string.Empty;
    public string ExamTitle { get; set; } = string.Empty;
    public int PlayerCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<string> Players { get; set; } = new();
}
