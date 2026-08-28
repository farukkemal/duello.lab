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
            DurationSeconds = RoomService.CalculateMatchDuration(questions.Count),
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

        // Populate realistic Battleground AI contestants if needed
        var botNames = new[] {
            "Alp", "Zeynep", "Demir", "Asya", "Mehmet", "Elif", "Kaan", "Defne",
            "Mert", "Ece", "Burak", "Selin", "Onur", "İpek", "Emre", "Büşra",
            "Doruk", "Damla", "Yusuf", "Aylin", "Umut", "Melis", "Oğuz", "Ceren",
            "Barış", "Deniz", "Tuna", "Sude", "Arda", "Eda", "Tolga", "Bengü",
            "Hakan", "Gizem", "Cem", "Hazal", "Volkan", "Gamze", "Yiğit", "Beril",
            "Bora", "Pelin", "Eren", "Derin", "Serkan", "Lara", "Kerem", "Sena"
        };

        var difficulties = new[] { "berkay", "selin", "emre", "nur", "esma" };
        var rnd = new Random();
        if (room.Users.Count < 30)
        {
            int targetTotal = Math.Min(48, 30 + rnd.Next(10, 18));
            int botsToAdd = targetTotal - room.Users.Count;
            for (int i = 0; i < botsToAdd && i < botNames.Length; i++)
            {
                var botId = Guid.NewGuid().ToString();
                var botDiff = difficulties[rnd.Next(difficulties.Length)];
                room.Users[botId] = new RoomUserInfo
                {
                    UserId = botId,
                    Username = $"[Bot] {botNames[i]}",
                    Level = rnd.Next(2, 20),
                    IsBot = true,
                    BotDifficulty = botDiff,
                    IsReady = true,
                    CurrentQuestionIndex = 0,
                    AnsweredCount = 0,
                    ProgressPercentage = 0
                };
            }
        }

        room.Status = RoomStatus.InProgress;
        room.StartTime = DateTime.UtcNow.AddSeconds(3); // 3s countdown
        room.SafeZonePlayersRemaining = room.Users.Count;
        room.CurrentZoneRound = 1;

        await _roomStateService.CreateRoomAsync(room);

        _logger.LogInformation("🔥 {Count} Kişilik Battleground başladı: {RoomCode}, Sorular 22 gün kilitlendi.", room.Users.Count, roomCode);

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

        bool isCorrect = false;
        if (!string.IsNullOrWhiteSpace(selectedAnswer))
        {
            var correctTarget = (question.CorrectAnswer ?? string.Empty).Trim();
            if (selectedAnswer.Contains(','))
            {
                var options = selectedAnswer.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                isCorrect = options.Any(opt => opt.Equals(correctTarget, StringComparison.OrdinalIgnoreCase));
            }
            else
            {
                isCorrect = string.Equals(selectedAnswer.Trim(), correctTarget, StringComparison.OrdinalIgnoreCase);
            }
        }

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
