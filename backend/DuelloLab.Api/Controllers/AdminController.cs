using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IExamService _examService;

    public AdminController(IExamService examService)
    {
        _examService = examService;
    }

    [HttpPost("exams/import")]
    public async Task<ActionResult> ImportExam([FromBody] ExamImportDto dto)
    {
        var examId = await _examService.ImportExamAsync(dto);
        return Ok(new { examId, message = $"Exam imported successfully with {dto.Questions.Count} questions." });
    }
}
