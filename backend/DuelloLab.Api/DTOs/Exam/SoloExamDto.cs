namespace DuelloLab.Api.DTOs.Exam;

public class SoloExamDto
{
    public Guid ExamId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string StartToken { get; set; } = string.Empty; // Signed JWT with start timestamp
    public List<SoloQuestionDto> Questions { get; set; } = new();
}

public class SoloQuestionDto
{
    public Guid Id { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public Dictionary<string, string> Choices { get; set; } = new();
    public string? ImageUrl { get; set; }
    // NOTE: CorrectAnswer is NOT included - anti-cheat
}
