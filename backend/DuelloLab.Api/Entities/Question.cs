using DuelloLab.Api.Enums;

namespace DuelloLab.Api.Entities;

public class Question
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ExamId { get; set; }
    public string Branch { get; set; } = string.Empty; // Matematik, Fizik, etc.
    public string QuestionText { get; set; } = string.Empty;
    public Dictionary<string, string> Choices { get; set; } = new(); // JSONB: {"A":"...","B":"...","C":"...","D":"...","E":"..."}
    public string CorrectAnswer { get; set; } = string.Empty; // A/B/C/D/E
    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public PoolType PoolType { get; set; } = PoolType.Solo;
    public DateTime? AvailableAfter { get; set; } // 22-day cooldown for battleground

    // Navigation
    public Exam Exam { get; set; } = null!;
}
