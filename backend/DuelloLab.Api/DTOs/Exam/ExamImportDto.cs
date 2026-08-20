using System.ComponentModel.DataAnnotations;

namespace DuelloLab.Api.DTOs.Exam;

public class ExamImportDto
{
    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = string.Empty;

    [Required]
    public List<QuestionImportDto> Questions { get; set; } = new();
}

public class QuestionImportDto
{
    [Required]
    public string Branch { get; set; } = string.Empty;

    [Required]
    public string QuestionText { get; set; } = string.Empty;

    [Required]
    public Dictionary<string, string> Choices { get; set; } = new();

    [Required]
    public string CorrectAnswer { get; set; } = string.Empty;

    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public string PoolType { get; set; } = "solo";
}
