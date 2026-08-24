using DuelloLab.Api.DTOs.Exam;

namespace DuelloLab.Api.Models.Realtime;

public enum GameMode
{
    CustomRoom = 0,
    Ranked1v1 = 1,
    Battleground100 = 2,
    SuddenDeath = 3,
    Squad2v2 = 4
}

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

    // Team Battle (Squad 2v2)
    public string Team { get; set; } = "Red"; // "Red" | "Blue"

    // Battleground & Sudden Death Elimination
    public bool IsEliminated { get; set; } = false;
    public int EliminatedAtQuestion { get; set; } = 0;
    public string EliminationReason { get; set; } = string.Empty;

    // Gameplay Progress & Results
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

    // Bot Properties
    public bool IsBot { get; set; } = false;
    public string BotDifficulty { get; set; } = string.Empty; // "berkay"|"selin"|"emre"|"nur"|"esma"
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
    public GameMode Mode { get; set; } = GameMode.CustomRoom;
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

    // Battleground Zone Dynamics
    public int CurrentZoneRound { get; set; } = 1;
    public int SafeZonePlayersRemaining { get; set; } = 100;
    public int TotalEliminatedCount { get; set; } = 0;
}

public class OnlineStatsDto
{
    public int ConnectedClientsCount { get; set; }
    public int OnlineUsersCount { get; set; }
    public int ActiveRoomsCount { get; set; }
    public int InQueuePlayersCount { get; set; }
    public bool IsRedisActive { get; set; }
    public DateTime ServerTime { get; set; } = DateTime.UtcNow;
}
