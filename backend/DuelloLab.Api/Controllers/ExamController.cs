using System.Security.Claims;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[ApiController]
[Route("api/exams")]
[Authorize]
public class ExamController : ControllerBase
{
    private readonly IExamService _examService;

    public ExamController(IExamService examService)
    {
        _examService = examService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("solo")]
    public async Task<ActionResult<List<ExamListDto>>> GetSoloExams()
    {
        var exams = await _examService.GetSoloExamsAsync();
        return Ok(exams);
    }

    [HttpGet("solo/{examId}")]
    public async Task<ActionResult<SoloExamDto>> GetSoloExam(Guid examId)
    {
        var exam = await _examService.GetSoloExamByIdAsync(examId, GetUserId());
        return Ok(exam);
    }

    [HttpPost("submit")]
    public async Task<ActionResult<ExamResultDto>> SubmitExam([FromBody] ExamSubmitDto dto)
    {
        var result = await _examService.SubmitExamAsync(dto, GetUserId());
        return Ok(result);
    }
}
