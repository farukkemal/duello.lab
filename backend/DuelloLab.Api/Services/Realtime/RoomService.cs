using System.Collections.Concurrent;
using System.Security.Cryptography;
using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Entities;
using DuelloLab.Api.Enums;
using DuelloLab.Api.Models.Realtime;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Realtime;

public class RoomService : IRoomService
{
    private readonly AppDbContext _db;
    private readonly IRoomStateService _roomState;
    private static readonly ConcurrentDictionary<string, SemaphoreSlim>
    MatchFinishLocks = new();
    private const int RoomCreationCost = 50;
    private static readonly char[] CodeCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    public RoomService(AppDbContext db, IRoomStateService roomState)
    {
        _db = db;
        _roomState = roomState;
    }

    public async Task<RoomResponseDto> CreateRoomAsync(Guid userId, CreateRoomDto dto)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (user.CoinBalance < RoomCreationCost)
            throw new InvalidOperationException($"Yetersiz bakiye! Oda kurmak için {RoomCreationCost} Coin gereklidir. Mevcut bakiyeniz: {user.CoinBalance} Coin.");

        // 1. Deduct 50 Coins
        user.CoinBalance -= RoomCreationCost;
        await _db.SaveChangesAsync();


        // 2. Select battleground pool questions

        var now = DateTime.UtcNow;

        var questionQuery = _db.Questions
            .Where(q =>
                q.PoolType == PoolType.Battleground &&
                (q.AvailableAfter == null || q.AvailableAfter < now));

        if (!string.IsNullOrWhiteSpace(dto.Category))
        {
            var categoryQuestions = questionQuery
                .Where(q =>
                    q.Exam.Category.ToLower() == dto.Category.ToLower());

            if (await categoryQuestions.AnyAsync())
            {
                questionQuery = categoryQuestions;
            }
        }

        var availableQuestions = await questionQuery
            .Select(q => q.Id)
            .ToListAsync();

        var count = Math.Min(
            dto.QuestionCount > 0 ? dto.QuestionCount : 5,
            availableQuestions.Count);

        var selectedQuestionIds = availableQuestions
            .OrderBy(_ => Guid.NewGuid())
            .Take(count)
            .ToList();

        // 3. Generate unique 4-character room code
        string roomCode;
        int attempts = 0;
        do
        {
            roomCode = GenerateRoomCode();
            var existing = await _roomState.GetRoomAsync(roomCode);
            if (existing == null) break;
            attempts++;
        } while (attempts < 10);

        // 4. Create RoomState with Host
        var hostUser = new RoomUserInfo
        {
            UserId = user.Id.ToString(),
            Username = user.Username,
            Level = user.Level,
            IsHost = true,
            IsReady = true,
            JoinedAt = DateTime.UtcNow
        };

        var room = new RoomState
        {
            RoomCode = roomCode,
            Title = string.IsNullOrWhiteSpace(dto.Title) ? "Hızlı Düello" : dto.Title,
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "TYT" : dto.Category,
            HostUserId = user.Id.ToString(),
            HostUsername = user.Username,
            QuestionCount = selectedQuestionIds.Count,
            QuestionIds = selectedQuestionIds,
            Status = RoomStatus.Waiting,
            MaxPlayers = 100,
            DurationSeconds = Math.Max(60, selectedQuestionIds.Count * 45), // 45 seconds per question
            CreatedAt = DateTime.UtcNow
        };

        room.Users[user.Id.ToString()] = hostUser;

        await _roomState.CreateRoomAsync(room);
        await _roomState.SetUserRoomAsync(user.Id.ToString(), roomCode);

        return MapToDto(room, user.CoinBalance);
    }

    public async Task<RoomResponseDto?> GetRoomByCodeAsync(string roomCode)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper());
        if (room == null) return null;
        return MapToDto(room);
    }

    public async Task<RoomResponseDto> JoinRoomAsync(Guid userId, string roomCode)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper())
            ?? throw new InvalidOperationException("Oda bulunamadı veya süresi dolmuş.");

        if (room.Status != RoomStatus.Waiting)
            throw new InvalidOperationException("Oda şu anda bekleme durumunda değil veya oyun başlamış.");

        if (room.Users.Count >= room.MaxPlayers)
            throw new InvalidOperationException("Oda maksimum oyuncu kapasitesine ulaştı.");

        var user = await _db.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        var roomUser = new RoomUserInfo
        {
            UserId = user.Id.ToString(),
            Username = user.Username,
            Level = user.Level,
            IsHost = room.HostUserId == user.Id.ToString(),
            IsReady = room.HostUserId == user.Id.ToString(),
            JoinedAt = DateTime.UtcNow
        };

        await _roomState.JoinRoomAsync(room.RoomCode, roomUser);
        room.Users[user.Id.ToString()] = roomUser;

        return MapToDto(room, user.CoinBalance);
    }

    public async Task<MatchStartingDto> StartMatchAsync(Guid userId, string roomCode)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper())
            ?? throw new InvalidOperationException("Oda bulunamadı.");

        if (room.HostUserId != userId.ToString())
            throw new InvalidOperationException("Yalnızca oda kurucusu oyunu başlatabilir.");

        if (room.Status != RoomStatus.Waiting)
            throw new InvalidOperationException("Oyun zaten başlatılmış durumda.");

        var questions = await _db.Questions
            .Where(q => room.QuestionIds.Contains(q.Id))
            .Select(q => new SoloQuestionDto
            {
                Id = q.Id,
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                ImageUrl = q.ImageUrl
            })
            .ToListAsync();

        room.Questions = questions;
        room.QuestionCount = questions.Count;
        room.Status = RoomStatus.InProgress;
        // Central 3-second synchronized countdown
        room.StartTime = DateTime.UtcNow.AddSeconds(3);
        room.DurationSeconds = Math.Max(60, questions.Count * 45);

        foreach (var u in room.Users.Values)
        {
            u.CurrentQuestionIndex = 0;
            u.AnsweredCount = 0;
            u.ProgressPercentage = 0;
            u.IsFinished = false;
            u.FinishedAt = null;
            u.DurationMs = 0;
            u.NetScore = 0;
            u.UserAnswers.Clear();
        }

        await _roomState.CreateRoomAsync(room);

        return new MatchStartingDto
        {
            RoomCode = room.RoomCode,
            Title = room.Title,
            Category = room.Category,
            CountdownSeconds = 3,
            StartTime = room.StartTime.Value,
            DurationSeconds = room.DurationSeconds,
            TotalQuestions = room.QuestionCount,
            Questions = questions
        };
    }

    public async Task<PlayerProgressDto> UpdateProgressAsync(
        Guid userId,
        string roomCode,
        int currentQuestionIndex,
        int answeredCount,
        Guid? answeredQuestionId = null,
        string? selectedChoice = null)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper())
            ?? throw new InvalidOperationException("Oda bulunamadı.");

        if (!room.Users.TryGetValue(userId.ToString(), out var user))
            throw new InvalidOperationException("Kullanıcı bu odada bulunamadı.");

        user.CurrentQuestionIndex = currentQuestionIndex;
        user.AnsweredCount = answeredCount;
        user.ProgressPercentage = room.QuestionCount > 0
            ? Math.Min(100, (int)((double)answeredCount / room.QuestionCount * 100))
            : 0;

        if (answeredQuestionId.HasValue)
        {
            user.UserAnswers[answeredQuestionId.Value] = selectedChoice;
        }

        await _roomState.CreateRoomAsync(room);

        return new PlayerProgressDto
        {
            UserId = user.UserId,
            Username = user.Username,
            CurrentQuestionIndex = user.CurrentQuestionIndex,
            AnsweredCount = user.AnsweredCount,
            ProgressPercentage = user.ProgressPercentage
        };
    }

    public async Task<(MatchPlayerResultDto playerResult, MatchEndedDto? matchEnded)> SubmitMatchAsync(
        Guid userId,
        string roomCode,
        List<AnswerDto> answers)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper())
            ?? throw new InvalidOperationException("Oda bulunamadı.");

        if (!room.Users.TryGetValue(userId.ToString(), out var roomUser))
            throw new InvalidOperationException("Kullanıcı bu odada bulunamadı.");
        if (room.Status != RoomStatus.InProgress)
        {
            throw new InvalidOperationException(
                "Sadece devam eden bir maç için cevap gönderilebilir.");
        }

        if (!room.StartTime.HasValue)
        {
            throw new InvalidOperationException(
                "Maçın başlangıç zamanı bulunamadı.");
        }

        if (DateTime.UtcNow < room.StartTime.Value)
        {
            throw new InvalidOperationException(
                "Maç henüz başlamadı.");
        }

        if (roomUser.IsFinished)
        {
            throw new InvalidOperationException(
                "Sınavınızı daha önce tamamladınız. Cevaplar tekrar gönderilemez.");
        }

        var submittedAt = DateTime.UtcNow;
        var startTime = room.StartTime ?? submittedAt;
        var durationMs = Math.Max(0, (long)(submittedAt - startTime).TotalMilliseconds);

        // Store answers
        foreach (var a in answers)
        {
            roomUser.UserAnswers[a.QuestionId] = a.SelectedAnswer;
        }

        // Fetch questions with correct answers from DB
        var questionEntities = await _db.Questions
            .Where(q => room.QuestionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        int correctCount = 0;
        int wrongCount = 0;
        int blankCount = 0;

        foreach (var answer in answers)
        {
            if (!questionEntities.TryGetValue(answer.QuestionId, out var q))
                continue;

            if (string.IsNullOrWhiteSpace(answer.SelectedAnswer))
            {
                blankCount++;
            }
            else if (answer.SelectedAnswer.Trim().Equals(q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                correctCount++;
            }
            else
            {
                wrongCount++;
            }
        }

        var answeredIds = answers.Select(a => a.QuestionId).ToHashSet();
        blankCount += room.QuestionIds.Count(id => !answeredIds.Contains(id));

        decimal netScore = correctCount - (wrongCount / 2.0m);

        roomUser.IsFinished = true;
        roomUser.FinishedAt = submittedAt;
        roomUser.DurationMs = durationMs;
        roomUser.NetScore = netScore;
        roomUser.CorrectCount = correctCount;
        roomUser.WrongCount = wrongCount;
        roomUser.BlankCount = blankCount;
        roomUser.ProgressPercentage = 100;

        // Temporary rank among current finished
        var currentFinished = room.Users.Values
            .Where(u => u.IsFinished)
            .OrderByDescending(u => u.NetScore)
            .ThenBy(u => u.DurationMs)
            .ToList();

        for (int i = 0; i < currentFinished.Count; i++)
        {
            currentFinished[i].Rank = i + 1;
        }

        await _roomState.CreateRoomAsync(room);

        var playerResult = new MatchPlayerResultDto
        {
            UserId = roomUser.UserId,
            Username = roomUser.Username,
            Level = roomUser.Level,
            Rank = roomUser.Rank,
            NetScore = roomUser.NetScore,
            DurationMs = roomUser.DurationMs,
            CorrectCount = roomUser.CorrectCount,
            WrongCount = roomUser.WrongCount,
            BlankCount = roomUser.BlankCount,
            XpGained = Math.Max(0, (int)(netScore * 10)),
            CoinsGained = 5,
            IsFinished = true
        };

        MatchEndedDto? matchEnded = null;
        bool allFinished = room.Users.Values.All(u => u.IsFinished);
        if (allFinished)
        {
            matchEnded = await FinishMatchAsync(roomCode);
        }

        return (playerResult, matchEnded);
    }
    public async Task<MatchEndedDto> ForceTimeUpAsync(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();

        var room = await _roomState.GetRoomAsync(code)
            ?? throw new InvalidOperationException(
                "Oda bulunamadı veya maç daha önce tamamlandı.");

        if (room.Status != RoomStatus.InProgress)
        {
            throw new InvalidOperationException(
                "Sadece devam eden bir maç süre dolumu nedeniyle bitirilebilir.");
        }

        if (!room.StartTime.HasValue)
        {
            throw new InvalidOperationException(
                "Maçın başlangıç zamanı bulunamadı.");
        }

        var now = DateTime.UtcNow;
        var endTime = room.StartTime.Value.AddSeconds(room.DurationSeconds);

        if (now < endTime)
        {
            var remainingSeconds = Math.Ceiling((endTime - now).TotalSeconds);

            throw new InvalidOperationException(
                $"Maç süresi henüz dolmadı. Kalan süre: {remainingSeconds} saniye.");
        }

        return await FinishMatchAsync(code);
    }
    public async Task<MatchEndedDto> FinishMatchAsync(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();

        var finishLock = MatchFinishLocks.GetOrAdd(
            code,
            _ => new SemaphoreSlim(1, 1));

        await finishLock.WaitAsync();

        try
        {
            return await FinishMatchCoreAsync(code);
        }
        finally
        {
            finishLock.Release();
        }
    }
    private async Task<MatchEndedDto> FinishMatchCoreAsync(string roomCode)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper())
            ?? throw new InvalidOperationException("Oda bulunamadı.");

        var questionEntities = await _db.Questions
            .Where(q => room.QuestionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        var examId = questionEntities.Values.FirstOrDefault()?.ExamId ?? Guid.Empty;
        var now = DateTime.UtcNow;
        var startTime = room.StartTime ?? now;

        // 1. Evaluate any unsubmitted users
        foreach (var roomUser in room.Users.Values)
        {
            if (!roomUser.IsFinished)
            {
                int correctCount = 0;
                int wrongCount = 0;
                int blankCount = 0;

                foreach (var qId in room.QuestionIds)
                {
                    if (!questionEntities.TryGetValue(qId, out var q)) continue;

                    if (roomUser.UserAnswers.TryGetValue(qId, out var selected) && !string.IsNullOrWhiteSpace(selected))
                    {
                        if (selected.Trim().Equals(q.CorrectAnswer.Trim(), StringComparison.OrdinalIgnoreCase))
                            correctCount++;
                        else
                            wrongCount++;
                    }
                    else
                    {
                        blankCount++;
                    }
                }

                roomUser.CorrectCount = correctCount;
                roomUser.WrongCount = wrongCount;
                roomUser.BlankCount = blankCount;
                roomUser.NetScore = correctCount - (wrongCount / 2.0m);
                roomUser.DurationMs = (long)(now - startTime).TotalMilliseconds;
                roomUser.IsFinished = true;
                roomUser.FinishedAt = now;
                roomUser.ProgressPercentage = 100;
            }
        }

        // 2. Sort Leaderboard by NetScore DESC, DurationMs ASC (Tie-Breaker!)
        var orderedUsers = room.Users.Values
            .OrderByDescending(u => u.NetScore)
            .ThenBy(u => u.DurationMs)
            .ToList();

        // 3. Assign Ranks & Distribute Rewards
        var userResultsToInsert = new List<UserResult>();

        for (int i = 0; i < orderedUsers.Count; i++)
        {
            var u = orderedUsers[i];
            u.Rank = i + 1;

            int baseXP = Math.Max(0, (int)(u.NetScore * 10));
            int bonusXP = 0;
            int coins = 5; // Base participation reward

            if (u.Rank == 1)
            {
                bonusXP = 100;
                coins = 40;
            }
            else if (u.Rank == 2)
            {
                bonusXP = 50;
                coins = 20;
            }
            else if (u.Rank == 3)
            {
                bonusXP = 25;
                coins = 10;
            }

            u.XpGained = baseXP + bonusXP;
            u.CoinsGained = coins;

            // Persistence: UserResult record
            if (Guid.TryParse(u.UserId, out var uid))
            {
                userResultsToInsert.Add(new UserResult
                {
                    UserId = uid,
                    ExamId = examId,
                    CorrectCount = u.CorrectCount,
                    WrongCount = u.WrongCount,
                    BlankCount = u.BlankCount,
                    NetScore = u.NetScore,
                    DurationMs = u.DurationMs,
                    XpGained = u.XpGained,
                    CreatedAt = now
                });

                // Update User XP, Level, and CoinBalance
                var userEntity = await _db.Users.FindAsync(uid);
                if (userEntity != null)
                {
                    userEntity.XP += u.XpGained;
                    userEntity.Level = (userEntity.XP / 1000) + 1;
                    userEntity.CoinBalance += u.CoinsGained;
                }
            }
        }

        // 4. Save to PostgreSQL
        if (userResultsToInsert.Count > 0)
        {
            _db.UserResults.AddRange(userResultsToInsert);
        }
        await _db.SaveChangesAsync();

        // 5. Clean up Room from Redis / Memory
        // 5. Keep the finished room until the host leaves
        // or all participants leave.
        room.Status = RoomStatus.Finished;
        await _roomState.CreateRoomAsync(room);

        // 6. Return full match summary
        return new MatchEndedDto
        {
            RoomCode = room.RoomCode,
            Title = room.Title,
            Category = room.Category,
            TotalPlayers = orderedUsers.Count,
            EndedAt = now,
            Leaderboard = orderedUsers.Select(u => new MatchPlayerResultDto
            {
                UserId = u.UserId,
                Username = u.Username,
                Level = u.Level,
                Rank = u.Rank,
                NetScore = u.NetScore,
                DurationMs = u.DurationMs,
                CorrectCount = u.CorrectCount,
                WrongCount = u.WrongCount,
                BlankCount = u.BlankCount,
                XpGained = u.XpGained,
                CoinsGained = u.CoinsGained,
                IsFinished = true
            }).ToList()
        };
    }

    public async Task<MatchEndedDto> GetRoomLeaderboardAsync(string roomCode)
    {
        var room = await _roomState.GetRoomAsync(roomCode.ToUpper());
        if (room == null)
        {
            return new MatchEndedDto
            {
                RoomCode = roomCode,
                Title = "Düello",
                Leaderboard = new List<MatchPlayerResultDto>()
            };
        }

        var ordered = room.Users.Values
            .OrderByDescending(u => u.NetScore)
            .ThenBy(u => u.DurationMs)
            .Select((u, index) => new MatchPlayerResultDto
            {
                UserId = u.UserId,
                Username = u.Username,
                Level = u.Level,
                Rank = index + 1,
                NetScore = u.NetScore,
                DurationMs = u.DurationMs,
                CorrectCount = u.CorrectCount,
                WrongCount = u.WrongCount,
                BlankCount = u.BlankCount,
                XpGained = u.XpGained,
                CoinsGained = u.CoinsGained,
                IsFinished = u.IsFinished
            })
            .ToList();

        return new MatchEndedDto
        {
            RoomCode = room.RoomCode,
            Title = room.Title,
            Category = room.Category,
            TotalPlayers = ordered.Count,
            Leaderboard = ordered
        };
    }

    private static string GenerateRoomCode()
    {
        var chars = new char[4];
        for (int i = 0; i < 4; i++)
        {
            chars[i] = CodeCharacters[RandomNumberGenerator.GetInt32(CodeCharacters.Length)];
        }
        return new string(chars);
    }

    private static RoomResponseDto MapToDto(RoomState room, int coinBalance = 0) => new()
    {
        RoomCode = room.RoomCode,
        Title = room.Title,
        Category = room.Category,
        HostUserId = room.HostUserId,
        HostUsername = room.HostUsername,
        QuestionCount = room.QuestionCount,
        Status = room.Status,
        MaxPlayers = room.MaxPlayers,
        NewCoinBalance = coinBalance,
        StartTime = room.StartTime,
        DurationSeconds = room.DurationSeconds,
        Users = room.Users.Values.ToList(),
        Questions = room.Questions,
        CreatedAt = room.CreatedAt
    };
}
