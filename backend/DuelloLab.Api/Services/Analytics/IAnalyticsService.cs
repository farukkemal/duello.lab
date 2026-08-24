using DuelloLab.Api.DTOs.Analytics;

namespace DuelloLab.Api.Services.Analytics;

public interface IAnalyticsService
{
    Task<AiCoachReportDto> GetAiCoachReportAsync(Guid userId);
    Task<ExamReviewDto?> GetExamReviewAsync(Guid userId, Guid examId, Dictionary<string, string?>? answers = null);
}
