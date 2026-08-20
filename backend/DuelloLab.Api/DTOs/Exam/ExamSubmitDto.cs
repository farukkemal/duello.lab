using System.ComponentModel.DataAnnotations;

namespace DuelloLab.Api.DTOs.Exam;

public class ExamSubmitDto
{
    [Required]
    public Guid ExamId { get; set; }

    [Required]
    public string StartToken { get; set; } = string.Empty;

    [Required]
    public List<AnswerDto> Answers { get; set; } = new();
}

public class AnswerDto
{
    public Guid QuestionId { get; set; }
    public string? SelectedAnswer { get; set; } // null = blank
}
