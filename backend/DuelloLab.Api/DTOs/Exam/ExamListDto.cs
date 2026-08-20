namespace DuelloLab.Api.DTOs.Exam;

public class ExamListDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public bool IsActive { get; set; }
}
