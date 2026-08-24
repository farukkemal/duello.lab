namespace DuelloLab.Api.DTOs.Analytics;

public class BranchPerformanceDto
{
    public string Branch { get; set; } = string.Empty;
    public int TotalAnswered { get; set; }
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public decimal AccuracyRate { get; set; } // Percentage e.g. 75.5
    public string MasteryLevel { get; set; } = "NeedsWork"; // "Critical", "NeedsWork", "Mastered"
    public string StatusColor { get; set; } = "amber"; // "rose", "amber", "emerald"
    public string Recommendation { get; set; } = string.Empty;
}

public class AiCoachReportDto
{
    public int TotalExamsTaken { get; set; }
    public int TotalQuestionsSolved { get; set; }
    public decimal OverallAccuracyRate { get; set; }
    public decimal AverageNetScore { get; set; }
    public string StrongestBranch { get; set; } = string.Empty;
    public string WeakestBranch { get; set; } = string.Empty;
    public List<BranchPerformanceDto> BranchHeatmap { get; set; } = new();
    public List<string> AiAdviceList { get; set; } = new();
    public string DailyRecommendedMode { get; set; } = "Ranked 1v1";
}

public class QuestionReviewDto
{
    public Guid QuestionId { get; set; }
    public string Branch { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public Dictionary<string, string> Choices { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? SelectedAnswer { get; set; }
    public bool IsCorrect { get; set; }
    public string? SolutionText { get; set; }
    public string? ImageUrl { get; set; }
    public string AiExplanationTip { get; set; } = string.Empty;
}

public class ExamReviewDto
{
    public Guid ExamId { get; set; }
    public string ExamTitle { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CorrectCount { get; set; }
    public int WrongCount { get; set; }
    public int BlankCount { get; set; }
    public decimal NetScore { get; set; }
    public List<QuestionReviewDto> Questions { get; set; } = new();
}
