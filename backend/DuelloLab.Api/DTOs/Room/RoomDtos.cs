using System.ComponentModel.DataAnnotations;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Models.Realtime;

namespace DuelloLab.Api.DTOs.Room;

public class CreateRoomDto
{
    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = "Hızlı Düello";

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = "TYT";

    public int QuestionCount { get; set; } = 5;
}

public class JoinRoomDto
{
    [Required]
    [MinLength(4)]
    [MaxLength(6)]
    public string RoomCode { get; set; } = string.Empty;
}

public class RoomResponseDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string HostUserId { get; set; } = string.Empty;
    public string HostUsername { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public RoomStatus Status { get; set; }
    public int MaxPlayers { get; set; }
    public int NewCoinBalance { get; set; }
    public DateTime? StartTime { get; set; }
    public int DurationSeconds { get; set; }
    public List<RoomUserInfo> Users { get; set; } = new();
    public List<SoloQuestionDto> Questions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public class MatchStartingDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CountdownSeconds { get; set; } = 3;
    public DateTime StartTime { get; set; }
    public int DurationSeconds { get; set; } = 300;
    public int TotalQuestions { get; set; }
    public List<SoloQuestionDto> Questions { get; set; } = new();
}

public class PlayerProgressDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int CurrentQuestionIndex { get; set; }
    public int AnsweredCount { get; set; }
    public int ProgressPercentage { get; set; }
}

public class SubmitMatchDto
{
    [Required]
    public string RoomCode { get; set; } = string.Empty;

    [Required]
    public List<AnswerDto> Answers { get; set; } = new();
}

public class MatchPlayerResultDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public int Level { get; set; }
    public int Rank { get; set; }
    public decimal NetScore { get; set; }
    public long DurationMs { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public int BlankCount { get; set; }
    public int XpGained { get; set; }
    public int CoinsGained { get; set; }
    public bool IsFinished { get; set; }
}

public class MatchEndedDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int TotalPlayers { get; set; }
    public DateTime EndedAt { get; set; } = DateTime.UtcNow;
    public List<MatchPlayerResultDto> Leaderboard { get; set; } = new();
    public MatchPlayerResultDto? Winner => Leaderboard.FirstOrDefault(l => l.Rank == 1);
}
