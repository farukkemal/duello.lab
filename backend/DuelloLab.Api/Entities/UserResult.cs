namespace DuelloLab.Api.Entities;

public class UserResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid ExamId { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public int BlankCount { get; set; }
    public decimal NetScore { get; set; } // Correct - (Wrong / 2)
    public long DurationMs { get; set; } // Server-side calculated
    public int XpGained { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Exam Exam { get; set; } = null!;
}
