using DuelloLab.Api.DTOs.Exam;

namespace DuelloLab.Api.Models.Realtime;

public class RoomUserInfo
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public string ConnectionId { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsHost { get; set; } = false;
    public bool IsReady { get; set; } = false;
    public decimal Score { get; set; } = 0;

    // Gameplay Progress & Results (FAZ 2.3 & 2.4)
    public int CurrentQuestionIndex { get; set; } = 0;
    public int AnsweredCount { get; set; } = 0;
    public int ProgressPercentage { get; set; } = 0;
    public bool IsFinished { get; set; } = false;
    public DateTime? FinishedAt { get; set; }
    public long DurationMs { get; set; } = 0;
    public decimal NetScore { get; set; } = 0;
    public int CorrectCount { get; set; } = 0;
    public int WrongCount { get; set; } = 0;
    public int BlankCount { get; set; } = 0;
    public int XpGained { get; set; } = 0;
    public int CoinsGained { get; set; } = 0;
    public int Rank { get; set; } = 0;
    public Dictionary<Guid, string?> UserAnswers { get; set; } = new();
}

public enum RoomStatus
{
    Waiting = 0,
    Starting = 1,
    InProgress = 2,
    Finished = 3
}

public class RoomState
{
    public string RoomCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public Guid? ExamId { get; set; }
    public string Category { get; set; } = "TYT";
    public string HostUserId { get; set; } = string.Empty;
    public string HostUsername { get; set; } = string.Empty;
    public int QuestionCount { get; set; } = 5;
    public List<Guid> QuestionIds { get; set; } = new();
    public List<SoloQuestionDto> Questions { get; set; } = new();
    public RoomStatus Status { get; set; } = RoomStatus.Waiting;
    public int MaxPlayers { get; set; } = 100;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartTime { get; set; }
    public int DurationSeconds { get; set; } = 300;
    public Dictionary<string, RoomUserInfo> Users { get; set; } = new();
}

public class OnlineStatsDto
{
    public int ConnectedClientsCount { get; set; }
    public int OnlineUsersCount { get; set; }
    public int ActiveRoomsCount { get; set; }
    public bool IsRedisActive { get; set; }
    public DateTime ServerTime { get; set; } = DateTime.UtcNow;
}
