namespace DuelloLab.Api.DTOs.Exam;

public class ExamResultDto
{
    public Guid ResultId { get; set; }
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public int BlankCount { get; set; }
    public decimal NetScore { get; set; }
    public long DurationMs { get; set; }
    public int XpGained { get; set; }
    public int NewTotalXp { get; set; }
    public int NewLevel { get; set; }
}
