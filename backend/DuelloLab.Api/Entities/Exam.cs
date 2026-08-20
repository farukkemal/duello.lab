namespace DuelloLab.Api.Entities;

public class Exam
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // TYT, AYT
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Question> Questions { get; set; } = new List<Question>();
    public ICollection<UserResult> UserResults { get; set; } = new List<UserResult>();
}
