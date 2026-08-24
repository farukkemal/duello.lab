using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Enums;
using DuelloLab.Api.Models.Realtime;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Realtime;

public class BattlegroundService : IBattlegroundService
{
    private readonly AppDbContext _db;
    private readonly IRoomStateService _roomStateService;
    private readonly ILogger<BattlegroundService> _logger;

    public BattlegroundService(
        AppDbContext db,
        IRoomStateService roomStateService,
        ILogger<BattlegroundService> logger)
    {
        _db = db;
        _roomStateService = roomStateService;
        _logger = logger;
    }

    public async Task<RoomResponseDto> CreateBattlegroundRoomAsync(string hostUserId, string hostUsername, string title, string category, int questionCount = 9)
    {
        var now = DateTime.UtcNow;

        // Query Battleground Pool with 22-day Cooldown Check
        var questions = await _db.Questions
            .Include(q => q.Exam)
            .Where(q => q.PoolType == PoolType.Battleground && (q.AvailableAfter == null || q.AvailableAfter <= now))
            .Where(q => q.Exam.Category.ToUpper() == category.ToUpper())
            .OrderBy(r => EF.Functions.Random())
            .Take(questionCount)
            .ToListAsync();

        // Fallback to Solo pool if not enough battleground questions
        if (questions.Count < questionCount)
        {
            var fallback = await _db.Questions
                .Include(q => q.Exam)
                .Where(q => q.Exam.Category.ToUpper() == category.ToUpper())
                .OrderBy(r => EF.Functions.Random())
                .Take(questionCount)
                .ToListAsync();
            questions = fallback;
        }

        var roomCode = Guid.NewGuid().ToString("N")[..4].ToUpper();

        var roomState = new RoomState
        {
            RoomCode = roomCode,
            Title = string.IsNullOrWhiteSpace(title) ? $"🔥 100 Kişilik Battleground #{roomCode}" : title,
            Category = category,
            Mode = GameMode.Battleground100,
            HostUserId = hostUserId,
            HostUsername = hostUsername,
            QuestionCount = questions.Count,
            QuestionIds = questions.Select(q => q.Id).ToList(),
            Questions = questions.Select(q => new SoloQuestionDto
            {
                Id = q.Id,
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                ImageUrl = q.ImageUrl
            }).ToList(),
            Status = RoomStatus.Waiting,
            MaxPlayers = 100,
            CreatedAt = now,
            DurationSeconds = questions.Count * 60,
            SafeZonePlayersRemaining = 100,
            CurrentZoneRound = 1
        };

        roomState.Users[hostUserId] = new RoomUserInfo
        {
            UserId = hostUserId,
            Username = hostUsername,
            IsHost = true,
            IsReady = true
        };

        await _roomStateService.CreateRoomAsync(roomState);

        return new RoomResponseDto
        {
            RoomCode = roomCode,
            Title = roomState.Title,
            Category = category,
            Mode = GameMode.Battleground100,
            HostUserId = hostUserId,
            HostUsername = hostUsername,
            QuestionCount = questions.Count,
            Status = RoomStatus.Waiting,
            MaxPlayers = 100,
            Users = roomState.Users.Values.ToList()
        };
    }

    public async Task<MatchStartingDto> StartBattlegroundMatchAsync(string roomCode)
    {
        var room = await _roomStateService.GetRoomAsync(roomCode);
        if (room == null) throw new InvalidOperationException("Battleground odası bulunamadı.");

        // Apply 22-Day Cooldown to Questions in Database
        var questionIds = room.QuestionIds;
        var questionsInDb = await _db.Questions.Where(q => questionIds.Contains(q.Id)).ToListAsync();
        foreach (var q in questionsInDb)
        {
            q.AvailableAfter = DateTime.UtcNow.AddDays(22);
        }
        await _db.SaveChangesAsync();

        room.Status = RoomStatus.InProgress;
        room.StartTime = DateTime.UtcNow.AddSeconds(3); // 3s countdown
        room.SafeZonePlayersRemaining = room.Users.Count;
        room.CurrentZoneRound = 1;

        await _roomStateService.CreateRoomAsync(room);

        _logger.LogInformation("🔥 100 Kişilik Battleground başladı: {RoomCode}, Sorular 22 gün kilitlendi.", roomCode);

        return new MatchStartingDto
        {
            RoomCode = roomCode,
            Title = room.Title,
            Category = room.Category,
            Mode = GameMode.Battleground100,
            CountdownSeconds = 3,
            StartTime = room.StartTime.Value,
            DurationSeconds = room.DurationSeconds,
            TotalQuestions = room.QuestionCount,
            Questions = room.Questions
        };
    }

    public async Task<ZoneShrunkDto?> ProcessZoneShrinkAsync(string roomCode, int currentQuestionIndex)
    {
        var room = await _roomStateService.GetRoomAsync(roomCode);
        if (room == null || room.Mode != GameMode.Battleground100) return null;

        var activePlayers = room.Users.Values
            .Where(u => !u.IsEliminated)
            .OrderByDescending(u => u.NetScore)
            .ThenBy(u => u.DurationMs)
            .ToList();

        if (activePlayers.Count <= 3) return null; // Keep top 3 for victory stage

        // Eliminate bottom 10% (at least 1 player)
        int eliminateCount = Math.Max(1, (int)Math.Ceiling(activePlayers.Count * 0.10));
        var toEliminate = activePlayers.TakeLast(eliminateCount).ToList();

        var eliminatedIds = new List<string>();
        var eliminatedNames = new List<string>();

        foreach (var p in toEliminate)
        {
            p.IsEliminated = true;
            p.EliminatedAtQuestion = currentQuestionIndex;
            p.EliminationReason = "Alan Dışında Kaldı 💀";
            eliminatedIds.Add(p.UserId);
            eliminatedNames.Add(p.Username);
        }

        room.CurrentZoneRound++;
        room.SafeZonePlayersRemaining = room.Users.Values.Count(u => !u.IsEliminated);
        room.TotalEliminatedCount += eliminateCount;

        await _roomStateService.CreateRoomAsync(room);

        _logger.LogInformation("⚠️ Alan Daraldı ({RoomCode}): {Count} oyuncu elendi. Kalan: {Remaining}",
            roomCode, eliminateCount, room.SafeZonePlayersRemaining);

        return new ZoneShrunkDto
        {
            CurrentZoneRound = room.CurrentZoneRound,
            PlayersRemaining = room.SafeZonePlayersRemaining,
            EliminatedUserIds = eliminatedIds,
            EliminatedUsernames = eliminatedNames,
            Message = $"⚠️ {room.CurrentZoneRound - 1}. Alan kapandı! {eliminateCount} oyuncu elendi. Kalan: {room.SafeZonePlayersRemaining}"
        };
    }

    public async Task<bool> ProcessSuddenDeathAnswerAsync(string roomCode, string userId, string questionId, string? selectedAnswer)
    {
        var room = await _roomStateService.GetRoomAsync(roomCode);
        if (room == null || room.Mode != GameMode.SuddenDeath) return false;

        if (!Guid.TryParse(questionId, out var qGuid)) return false;
        var question = await _db.Questions.FindAsync(qGuid);
        if (question == null) return false;

        bool isCorrect = string.Equals(selectedAnswer, question.CorrectAnswer, StringComparison.OrdinalIgnoreCase);

        if (!isCorrect && !string.IsNullOrEmpty(selectedAnswer))
        {
            if (room.Users.TryGetValue(userId, out var user))
            {
                user.IsEliminated = true;
                user.EliminatedAtQuestion = user.CurrentQuestionIndex;
                user.EliminationReason = "Yanlış Cevap Vererek Elendi 💀";
                await _roomStateService.CreateRoomAsync(room);
                return true; // Eliminated!
            }
        }

        return false;
    }
}
