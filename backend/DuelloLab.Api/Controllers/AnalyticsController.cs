using System.Security.Claims;
using DuelloLab.Api.DTOs.Analytics;
using DuelloLab.Api.Services.Analytics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("weakness-report")]
    public async Task<ActionResult<AiCoachReportDto>> GetWeaknessReport()
    {
        var report = await _analyticsService.GetAiCoachReportAsync(GetUserId());
        return Ok(report);
    }

    [HttpGet("review/{examId}")]
    public async Task<ActionResult<ExamReviewDto>> GetExamReview(Guid examId)
    {
        var review = await _analyticsService.GetExamReviewAsync(GetUserId(), examId);
        if (review == null) return NotFound("Sınav bulunamadı.");
        return Ok(review);
    }

    [HttpPost("review/{examId}/with-answers")]
    public async Task<ActionResult<ExamReviewDto>> GetExamReviewWithAnswers(Guid examId, [FromBody] Dictionary<string, string?> answers)
    {
        var review = await _analyticsService.GetExamReviewAsync(GetUserId(), examId, answers);
        if (review == null) return NotFound("Sınav bulunamadı.");
        return Ok(review);
    }
}
