using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Entities;
using DuelloLab.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services;

public class ExamService : IExamService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;

    public ExamService(AppDbContext db, ITokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    public async Task<Guid> ImportExamAsync(ExamImportDto dto)
    {
        var exam = new Exam
        {
            Title = dto.Title,
            Category = dto.Category
        };

        foreach (var q in dto.Questions)
        {
            var poolType = Enum.TryParse<PoolType>(q.PoolType, true, out var pt) ? pt : PoolType.Solo;

            exam.Questions.Add(new Question
            {
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                CorrectAnswer = q.CorrectAnswer.ToUpper(),
                SolutionText = q.SolutionText,
                ImageUrl = q.ImageUrl,
                PoolType = poolType
            });
        }

        _db.Exams.Add(exam);
        await _db.SaveChangesAsync();

        return exam.Id;
    }

    public async Task<List<ExamListDto>> GetSoloExamsAsync()
    {
        var now = DateTime.UtcNow;
        var poolTypeStr = PoolType.Solo.ToString();

        return await _db.Exams
            .Where(e => e.IsActive)
            .Where(e => e.Questions.Any(q =>
                q.PoolType == PoolType.Solo &&
                (q.AvailableAfter == null || q.AvailableAfter < now)))
            .Select(e => new ExamListDto
            {
                Id = e.Id,
                Title = e.Title,
                Category = e.Category,
                QuestionCount = e.Questions.Count(q =>
                    q.PoolType == PoolType.Solo &&
                    (q.AvailableAfter == null || q.AvailableAfter < now)),
                IsActive = e.IsActive
            })
            .ToListAsync();
    }

    public async Task<SoloExamDto> GetSoloExamByIdAsync(Guid examId, Guid userId)
    {
        var now = DateTime.UtcNow;

        var exam = await _db.Exams
            .Include(e => e.Questions
                .Where(q => q.PoolType == PoolType.Solo &&
                           (q.AvailableAfter == null || q.AvailableAfter < now)))
            .FirstOrDefaultAsync(e => e.Id == examId && e.IsActive)
            ?? throw new InvalidOperationException("Exam not found or not active.");

        // Generate anti-cheat start token with server timestamp
        var startToken = _tokenService.CreateStartToken(examId, userId);

        return new SoloExamDto
        {
            ExamId = exam.Id,
            Title = exam.Title,
            Category = exam.Category,
            StartToken = startToken,
            Questions = exam.Questions.Select(q => new SoloQuestionDto
            {
                Id = q.Id,
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                ImageUrl = q.ImageUrl
                // CorrectAnswer NOT included - anti-cheat
            }).ToList()
        };
    }

    public async Task<ExamResultDto> SubmitExamAsync(ExamSubmitDto dto, Guid userId)
    {
        // 1. Validate start token (anti-cheat: server-side timing)
        var startInfo = _tokenService.ValidateStartToken(dto.StartToken)
            ?? throw new InvalidOperationException("Invalid or expired start token.");

        if (startInfo.examId != dto.ExamId || startInfo.userId != userId)
            throw new InvalidOperationException("Start token does not match this exam or user.");

        var startedAt = startInfo.startedAt;
        var submittedAt = DateTime.UtcNow;
        var durationMs = (long)(submittedAt - startedAt).TotalMilliseconds;

        // 2. Get questions with correct answers
        var exam = await _db.Exams
            .Include(e => e.Questions)
            .FirstOrDefaultAsync(e => e.Id == dto.ExamId)
            ?? throw new InvalidOperationException("Exam not found.");

        var questionMap = exam.Questions.ToDictionary(q => q.Id);

        // 3. Calculate score: Net = Correct - (Wrong / 2)
        int correctCount = 0;
        int wrongCount = 0;
        int blankCount = 0;

        foreach (var answer in dto.Answers)
        {
            if (!questionMap.TryGetValue(answer.QuestionId, out var question))
                continue;

            if (string.IsNullOrEmpty(answer.SelectedAnswer))
            {
                blankCount++;
            }
            else if (answer.SelectedAnswer.Equals(question.CorrectAnswer, StringComparison.OrdinalIgnoreCase))
            {
                correctCount++;
            }
            else
            {
                wrongCount++;
            }
        }

        // Count questions not in the answer list as blank
        var answeredIds = dto.Answers.Select(a => a.QuestionId).ToHashSet();
        blankCount += exam.Questions.Count(q => !answeredIds.Contains(q.Id));

        decimal netScore = correctCount - (wrongCount / 2.0m);

        // 4. Calculate XP: max(0, NetScore * 10)
        int xpGained = Math.Max(0, (int)(netScore * 10));

        // 5. Update user XP and Level
        var user = await _db.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        user.XP += xpGained;
        user.Level = (user.XP / 1000) + 1; // Level up every 1000 XP

        // 6. Save result
        var result = new UserResult
        {
            UserId = userId,
            ExamId = dto.ExamId,
            CorrectCount = correctCount,
            WrongCount = wrongCount,
            BlankCount = blankCount,
            NetScore = netScore,
            DurationMs = durationMs,
            XpGained = xpGained
        };

        _db.UserResults.Add(result);
        await _db.SaveChangesAsync();

        return new ExamResultDto
        {
            ResultId = result.Id,
            ExamId = exam.Id,
            ExamTitle = exam.Title,
            TotalQuestions = exam.Questions.Count,
            CorrectCount = correctCount,
            WrongCount = wrongCount,
            BlankCount = blankCount,
            NetScore = netScore,
            DurationMs = durationMs,
            XpGained = xpGained,
            NewTotalXp = user.XP,
            NewLevel = user.Level
        };
    }
}
