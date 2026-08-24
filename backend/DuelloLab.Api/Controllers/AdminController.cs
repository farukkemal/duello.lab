using System.Security.Claims;
using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Admin;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Entities;
using DuelloLab.Api.Enums;
using DuelloLab.Api.Services;
using DuelloLab.Api.Services.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IExamService _examService;
    private readonly IRoomStateService _roomState;

    public AdminController(AppDbContext db, IExamService examService, IRoomStateService roomState)
    {
        _db = db;
        _examService = examService;
        _roomState = roomState;
    }

    // ───── Stats ─────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> GetStats()
    {
        var totalUsers = await _db.Users.CountAsync();
        var totalQuestions = await _db.Questions.CountAsync();
        var totalExams = await _db.Exams.CountAsync();
        var bannedUsers = await _db.Users.CountAsync(u => u.IsBanned);
        var totalCoins = await _db.Users.SumAsync(u => (long)u.CoinBalance);
        var activeRooms = (await _roomState.GetActiveRoomsAsync()).Count;

        return Ok(new AdminStatsDto
        {
            TotalUsers = totalUsers,
            TotalQuestions = totalQuestions,
            TotalExams = totalExams,
            BannedUsers = bannedUsers,
            TotalCoinsInCirculation = totalCoins,
            ActiveRooms = activeRooms
        });
    }

    // ───── Users ─────────────────────────────────────────────────────────────
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers([FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                u.Id.ToString().ToLower().Contains(s));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Level = u.Level,
                XP = u.XP,
                CoinBalance = u.CoinBalance,
                Role = u.Role,
                IsBanned = u.IsBanned,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        var total = await query.CountAsync();

        return Ok(new { users, total, page, pageSize });
    }

    [HttpGet("users/{id:guid}")]
    public async Task<ActionResult<AdminUserDto>> GetUser(Guid id)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        return Ok(new AdminUserDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            Level = u.Level,
            XP = u.XP,
            CoinBalance = u.CoinBalance,
            Role = u.Role,
            IsBanned = u.IsBanned,
            CreatedAt = u.CreatedAt
        });
    }

    [HttpPut("users/{id:guid}/economy")]
    public async Task<ActionResult<AdminUserDto>> UpdateEconomy(Guid id, [FromBody] AdminUpdateEconomyDto dto)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        u.XP = Math.Max(0, u.XP + dto.DeltaXP);
        u.CoinBalance = Math.Max(0, u.CoinBalance + dto.DeltaCoin);
        if (dto.SetLevel.HasValue) u.Level = Math.Max(1, dto.SetLevel.Value);

        await _db.SaveChangesAsync();

        return Ok(new AdminUserDto
        {
            Id = u.Id,
            Username = u.Username,
            Email = u.Email,
            Level = u.Level,
            XP = u.XP,
            CoinBalance = u.CoinBalance,
            Role = u.Role,
            IsBanned = u.IsBanned,
            CreatedAt = u.CreatedAt
        });
    }

    [HttpPut("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] AdminUpdateRoleDto dto)
    {
        // Prevent self-demotion
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id.ToString() == currentUserId && dto.Role != "Admin")
            return BadRequest(new { message = "Kendi admin rolünüzü kaldıramazsınız." });

        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        u.Role = dto.Role is "Admin" or "User" ? dto.Role : "User";
        await _db.SaveChangesAsync();

        return Ok(new { message = $"{u.Username} artık {u.Role}." });
    }

    [HttpPut("users/{id:guid}/ban")]
    public async Task<IActionResult> BanUser(Guid id, [FromBody] AdminBanDto dto)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id.ToString() == currentUserId)
            return BadRequest(new { message = "Kendinizi banlayamazsınız." });

        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();

        u.IsBanned = dto.IsBanned;
        await _db.SaveChangesAsync();

        return Ok(new { message = dto.IsBanned ? $"{u.Username} banlandı." : $"{u.Username} banı kaldırıldı." });
    }

    // ───── Questions ─────────────────────────────────────────────────────────
    [HttpGet("questions")]
    public async Task<ActionResult> GetQuestions(
        [FromQuery] string? search = null,
        [FromQuery] string? branch = null,
        [FromQuery] string? poolType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Questions.Include(q => q.Exam).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(q => q.QuestionText.ToLower().Contains(s) || q.Branch.ToLower().Contains(s));
        }
        if (!string.IsNullOrWhiteSpace(branch))
            query = query.Where(q => q.Branch == branch);
        if (!string.IsNullOrWhiteSpace(poolType) && Enum.TryParse<PoolType>(poolType, out var pt))
            query = query.Where(q => q.PoolType == pt);

        var total = await query.CountAsync();
        var questions = await query
            .OrderBy(q => q.Branch)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(q => new AdminQuestionDto
            {
                Id = q.Id,
                ExamId = q.ExamId,
                ExamTitle = q.Exam.Title,
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                CorrectAnswer = q.CorrectAnswer,
                SolutionText = q.SolutionText,
                ImageUrl = q.ImageUrl,
                PoolType = q.PoolType.ToString()
            })
            .ToListAsync();

        return Ok(new { questions, total, page, pageSize });
    }

    [HttpGet("questions/{id:guid}")]
    public async Task<ActionResult<AdminQuestionDto>> GetQuestion(Guid id)
    {
        var q = await _db.Questions.Include(q => q.Exam).FirstOrDefaultAsync(q => q.Id == id);
        if (q == null) return NotFound();

        return Ok(new AdminQuestionDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            ExamTitle = q.Exam.Title,
            Branch = q.Branch,
            QuestionText = q.QuestionText,
            Choices = q.Choices,
            CorrectAnswer = q.CorrectAnswer,
            SolutionText = q.SolutionText,
            ImageUrl = q.ImageUrl,
            PoolType = q.PoolType.ToString()
        });
    }

    [HttpPost("questions")]
    public async Task<ActionResult<AdminQuestionDto>> CreateQuestion([FromBody] AdminCreateQuestionDto dto)
    {
        var exam = await _db.Exams.FindAsync(dto.ExamId);
        if (exam == null) return BadRequest(new { message = "Belirtilen sınav bulunamadı." });

        if (!Enum.TryParse<PoolType>(dto.PoolType, out var poolType)) poolType = PoolType.Solo;

        var question = new Question
        {
            ExamId = dto.ExamId,
            Branch = dto.Branch,
            QuestionText = dto.QuestionText,
            Choices = dto.Choices,
            CorrectAnswer = dto.CorrectAnswer,
            SolutionText = dto.SolutionText,
            ImageUrl = dto.ImageUrl,
            PoolType = poolType
        };

        _db.Questions.Add(question);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetQuestion), new { id = question.Id }, new AdminQuestionDto
        {
            Id = question.Id,
            ExamId = question.ExamId,
            ExamTitle = exam.Title,
            Branch = question.Branch,
            QuestionText = question.QuestionText,
            Choices = question.Choices,
            CorrectAnswer = question.CorrectAnswer,
            SolutionText = question.SolutionText,
            ImageUrl = question.ImageUrl,
            PoolType = question.PoolType.ToString()
        });
    }

    [HttpPut("questions/{id:guid}")]
    public async Task<ActionResult<AdminQuestionDto>> UpdateQuestion(Guid id, [FromBody] AdminUpdateQuestionDto dto)
    {
        var q = await _db.Questions.Include(q => q.Exam).FirstOrDefaultAsync(q => q.Id == id);
        if (q == null) return NotFound();

        if (dto.Branch != null) q.Branch = dto.Branch;
        if (dto.QuestionText != null) q.QuestionText = dto.QuestionText;
        if (dto.Choices != null) q.Choices = dto.Choices;
        if (dto.CorrectAnswer != null) q.CorrectAnswer = dto.CorrectAnswer;
        if (dto.SolutionText != null) q.SolutionText = dto.SolutionText;
        if (dto.ImageUrl != null) q.ImageUrl = dto.ImageUrl;
        if (dto.PoolType != null && Enum.TryParse<PoolType>(dto.PoolType, out var pt)) q.PoolType = pt;

        await _db.SaveChangesAsync();

        return Ok(new AdminQuestionDto
        {
            Id = q.Id,
            ExamId = q.ExamId,
            ExamTitle = q.Exam.Title,
            Branch = q.Branch,
            QuestionText = q.QuestionText,
            Choices = q.Choices,
            CorrectAnswer = q.CorrectAnswer,
            SolutionText = q.SolutionText,
            ImageUrl = q.ImageUrl,
            PoolType = q.PoolType.ToString()
        });
    }

    [HttpDelete("questions/{id:guid}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        var q = await _db.Questions.FindAsync(id);
        if (q == null) return NotFound();

        _db.Questions.Remove(q);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Soru silindi." });
    }

    // ───── Exams list (for question creation dropdown) ────────────────────────
    [HttpGet("exams")]
    public async Task<ActionResult> GetExams()
    {
        var exams = await _db.Exams
            .Select(e => new { e.Id, e.Title, questionCount = e.Questions.Count })
            .ToListAsync();
        return Ok(exams);
    }

    // ───── Rooms ─────────────────────────────────────────────────────────────
    [HttpGet("rooms")]
    public async Task<ActionResult<List<AdminRoomDto>>> GetRooms()
    {
        var rooms = await _roomState.GetActiveRoomsAsync();
        var result = rooms.Select(r => new AdminRoomDto
        {
            Code = r.RoomCode,
            ExamTitle = !string.IsNullOrEmpty(r.Title) ? r.Title : r.RoomCode,
            PlayerCount = r.Users.Count,
            Status = r.Status.ToString(),
            Players = r.Users.Values.Select(u => u.Username).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpDelete("rooms/{code}")]
    public async Task<IActionResult> TerminateRoom(string code)
    {
        var ok = await _roomState.DeleteRoomAsync(code);
        if (!ok) return NotFound(new { message = "Oda bulunamadı." });
        return Ok(new { message = $"Oda {code} kapatıldı." });
    }

    // ───── Legacy: exam import (kept for backward compat) ───────────────────
    [HttpPost("exams/import")]
    public async Task<ActionResult> ImportExam([FromBody] ExamImportDto dto)
    {
        var examId = await _examService.ImportExamAsync(dto);
        return Ok(new { examId, message = $"Exam imported successfully with {dto.Questions.Count} questions." });
    }
}
