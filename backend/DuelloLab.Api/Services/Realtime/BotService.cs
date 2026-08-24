using System.Security.Cryptography;
using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.Hubs;
using DuelloLab.Api.Models.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Realtime;

/// <summary>
/// Bot zorluk seviyeleri — YKS sıralamasına göre doğru/yanlış oranları ve hız parametreleri.
/// Berkay (1M'inci) → Selin (500K'ıncı) → Emre (100K'ıncı) → Nur (50K'ıncı) → Esma (100'üncü)
/// </summary>
public static class BotDifficultyConfig
{
    private static readonly Dictionary<string, BotPlayerConfig> Configs = new()
    {
        ["berkay"] = new BotPlayerConfig
        {
            Difficulty   = "berkay",
            Username     = "🐢 Berkay",
            CorrectRate  = 0.40,
            WrongRate    = 0.30,
            MinDelayMs   = 25_000,
            MaxDelayMs   = 35_000
        },
        ["selin"] = new BotPlayerConfig
        {
            Difficulty   = "selin",
            Username     = "🌱 Selin",
            CorrectRate  = 0.55,
            WrongRate    = 0.25,
            MinDelayMs   = 18_000,
            MaxDelayMs   = 28_000
        },
        ["emre"] = new BotPlayerConfig
        {
            Difficulty   = "emre",
            Username     = "⚡ Emre",
            CorrectRate  = 0.70,
            WrongRate    = 0.15,
            MinDelayMs   = 12_000,
            MaxDelayMs   = 20_000
        },
        ["nur"] = new BotPlayerConfig
        {
            Difficulty   = "nur",
            Username     = "🔥 Nur",
            CorrectRate  = 0.82,
            WrongRate    = 0.10,
            MinDelayMs   = 8_000,
            MaxDelayMs   = 14_000
        },
        ["serra"] = new BotPlayerConfig
        {
            Difficulty   = "serra",
            Username     = "💎 Serra",
            CorrectRate  = 0.94,
            WrongRate    = 0.04,
            MinDelayMs   = 4_000,
            MaxDelayMs   = 8_000
        },
        ["esma"] = new BotPlayerConfig
        {
            Difficulty   = "serra",
            Username     = "💎 Serra",
            CorrectRate  = 0.94,
            WrongRate    = 0.04,
            MinDelayMs   = 4_000,
            MaxDelayMs   = 8_000
        }
    };


    public static BotPlayerConfig Get(string difficulty)
    {
        var key = difficulty.ToLowerInvariant();
        if (!Configs.TryGetValue(key, out var cfg))
            cfg = Configs["berkay"];

        // Deep copy so each bot gets its own unique ID
        return new BotPlayerConfig
        {
            BotId        = $"bot-{Guid.NewGuid():N}",
            Username     = cfg.Username,
            Difficulty   = cfg.Difficulty,
            CorrectRate  = cfg.CorrectRate,
            WrongRate    = cfg.WrongRate,
            MinDelayMs   = cfg.MinDelayMs,
            MaxDelayMs   = cfg.MaxDelayMs
        };
    }
}

public class BotService : IBotService
{
    private readonly IServiceScopeFactory   _scopeFactory;
    private readonly IRoomStateService      _roomState;
    private readonly IHubContext<DuelloHub> _hubContext;
    private readonly ILogger<BotService>    _logger;

    private static readonly char[] CodeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".ToCharArray();

    public BotService(
        IServiceScopeFactory   scopeFactory,
        IRoomStateService      roomState,
        IHubContext<DuelloHub> hubContext,
        ILogger<BotService>    logger)
    {
        _scopeFactory = scopeFactory;
        _roomState    = roomState;
        _hubContext   = hubContext;
        _logger       = logger;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Oda oluştur — botları ekle — oda kodunu döndür
    // ──────────────────────────────────────────────────────────────────────────
    public async Task<string> CreateBotRoomAsync(Guid userId, string username, CreateBotRoomRequest request)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Soru havuzundan soruları seç — önce Battleground, yoksa tüm havuz
        var now = DateTime.UtcNow;
        var questionQuery = db.Questions
            .Where(q => (q.AvailableAfter == null || q.AvailableAfter < now));

        // Kategori filtresi
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var catQ = questionQuery.Where(q => q.Exam.Category.ToLower() == request.Category.ToLower());
            if (await catQ.AnyAsync()) questionQuery = catQ;
        }

        var availableIds = await questionQuery.Select(q => q.Id).ToListAsync();
        if (availableIds.Count == 0)
            throw new InvalidOperationException("Seçilen kategoride soru bulunamadı. Lütfen farklı bir kategori deneyin.");

        var count = Math.Min(request.QuestionCount > 0 ? request.QuestionCount : 5, availableIds.Count);
        var selectedIds = availableIds.OrderBy(_ => Guid.NewGuid()).Take(count).ToList();


        // Benzersiz oda kodu üret
        string roomCode;
        int attempts = 0;
        do
        {
            var chars = new char[4];
            for (int i = 0; i < 4; i++)
                chars[i] = CodeChars[RandomNumberGenerator.GetInt32(CodeChars.Length)];
            roomCode = new string(chars) + "B"; // "B" suffix → bot odası
            attempts++;
        } while (await _roomState.GetRoomAsync(roomCode) != null && attempts < 20);

        // Host kullanıcıyı ekle
        var hostUser = new RoomUserInfo
        {
            UserId   = userId.ToString(),
            Username = username,
            Level    = 1,
            IsHost   = true,
            IsReady  = true,
            JoinedAt = now
        };

        var room = new RoomState
        {
            RoomCode       = roomCode,
            Title          = $"🤖 Bot Antrenmanı — {request.Category}",
            Category       = string.IsNullOrWhiteSpace(request.Category) ? "TYT" : request.Category,
            HostUserId     = userId.ToString(),
            HostUsername   = username,
            QuestionCount  = count,
            QuestionIds    = selectedIds,
            Status         = RoomStatus.Waiting,
            MaxPlayers     = 5,
            DurationSeconds= RoomService.CalculateMatchDuration(count),
            CreatedAt      = now
        };


        room.Users[userId.ToString()] = hostUser;

        // Botları ekle (1-4 arası, her biri farklı zorluk)
        var botConfigs = new List<BotPlayerConfig>();
        foreach (var diff in request.BotDifficulties.Take(4))
        {
            var cfg = BotDifficultyConfig.Get(diff);
            room.Users[cfg.BotId] = new RoomUserInfo
            {
                UserId        = cfg.BotId,
                Username      = cfg.Username,
                Level         = 1,
                IsHost        = false,
                IsReady       = true,
                IsBot         = true,
                BotDifficulty = cfg.Difficulty,
                JoinedAt      = now
            };
            botConfigs.Add(cfg);
        }

        await _roomState.CreateRoomAsync(room);
        await _roomState.SetUserRoomAsync(userId.ToString(), roomCode);

        _logger.LogInformation("🤖 Bot odası oluşturuldu: {Code} | {Count} bot | Kategori: {Cat}",
            roomCode, botConfigs.Count, request.Category);

        return roomCode;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Maç başlayınca botları simüle et (arka plan görevi)
    // ──────────────────────────────────────────────────────────────────────────
    public Task SimulateBotMatchAsync(string roomCode, List<BotPlayerConfig> bots)
    {
        // Her bot için bağımsız arka plan görevi
        foreach (var bot in bots)
        {
            _ = Task.Run(() => SimulateSingleBot(roomCode, bot));
        }
        return Task.CompletedTask;
    }

    private async Task SimulateSingleBot(string roomCode, BotPlayerConfig bot)
    {
        try
        {
            var room = await _roomState.GetRoomAsync(roomCode);
            if (room == null) return;

            // Başlangıç countdown'ını bekle
            await Task.Delay(3500);

            room = await _roomState.GetRoomAsync(roomCode);
            if (room == null || room.Status != RoomStatus.InProgress) return;

            var totalQ = room.QuestionCount;
            var rng    = new Random();

            for (int i = 0; i < totalQ; i++)
            {
                // Soru başı gecikme (zorluk hızına göre)
                int delay = rng.Next(bot.MinDelayMs, bot.MaxDelayMs);
                await Task.Delay(delay);

                // Oda hâlâ devam ediyor mu?
                room = await _roomState.GetRoomAsync(roomCode);
                if (room == null || room.Status != RoomStatus.InProgress) return;

                if (!room.Users.TryGetValue(bot.BotId, out var botUser)) return;

                // İlerleme güncelle
                botUser.CurrentQuestionIndex = i;
                botUser.AnsweredCount        = i + 1;
                botUser.ProgressPercentage   = totalQ > 0
                    ? Math.Min(100, (int)((double)(i + 1) / totalQ * 100))
                    : 0;

                // Cevap kararı — doğru/yanlış/boş
                double r = rng.NextDouble();
                string? choiceKey = null;
                if (r < bot.CorrectRate)
                {
                    // Doğru cevabı seç (sonraki aşamada değerlendirilecek)
                    choiceKey = "CORRECT"; // placeholder — FinishMatch içinde gerçek doğru cevap kontrol edilir
                }
                else if (r < bot.CorrectRate + bot.WrongRate)
                {
                    choiceKey = "WRONG";  // yanlış placeholder
                }
                // else → boş bırak

                if (room.QuestionIds.Count > i)
                {
                    botUser.UserAnswers[room.QuestionIds[i]] = choiceKey;
                }

                await _roomState.CreateRoomAsync(room);

                // SignalR ile progress yayınla
                await _hubContext.Clients.Group(roomCode).SendAsync("PlayerProgressUpdated", new
                {
                    userId              = bot.BotId,
                    username            = bot.Username,
                    currentQuestionIndex= i,
                    answeredCount       = i + 1,
                    progressPercentage  = botUser.ProgressPercentage
                });
            }

            // Bot tüm soruları tamamladı — gerçek cevapları değerlendir
            await FinalizeBotAnswers(roomCode, bot);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("⚠️ Bot simülasyon hatası ({BotId}): {Msg}", bot.BotId, ex.Message);
        }
    }

    private async Task FinalizeBotAnswers(string roomCode, BotPlayerConfig bot)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var room = await _roomState.GetRoomAsync(roomCode);
        if (room == null) return;
        if (!room.Users.TryGetValue(bot.BotId, out var botUser)) return;
        if (botUser.IsFinished) return;

        var questionEntities = await db.Questions
            .Where(q => room.QuestionIds.Contains(q.Id))
            .ToDictionaryAsync(q => q.Id);

        int correct = 0, wrong = 0, blank = 0;
        var rng = new Random();

        foreach (var qId in room.QuestionIds)
        {
            if (!questionEntities.TryGetValue(qId, out var q)) { blank++; continue; }

            if (botUser.UserAnswers.TryGetValue(qId, out var placeholder))
            {
                if (placeholder == "CORRECT")
                {
                    botUser.UserAnswers[qId] = q.CorrectAnswer;
                    correct++;
                }
                else if (placeholder == "WRONG")
                {
                    // Yanlış seçenek seç (doğrudan doğru olmayan herhangi bir şık)
                    var wrongChoices = q.Choices.Keys
                        .Where(k => k != q.CorrectAnswer)
                        .ToList();
                    var picked = wrongChoices.Count > 0
                        ? wrongChoices[rng.Next(wrongChoices.Count)]
                        : null;
                    botUser.UserAnswers[qId] = picked;
                    wrong++;
                }
                else
                {
                    botUser.UserAnswers[qId] = null;
                    blank++;
                }
            }
            else
            {
                blank++;
            }
        }

        var now       = DateTime.UtcNow;
        var startTime = room.StartTime ?? now;

        botUser.CorrectCount       = correct;
        botUser.WrongCount         = wrong;
        botUser.BlankCount         = blank;
        botUser.NetScore           = correct - (wrong / 2.0m);
        botUser.DurationMs         = (long)(now - startTime).TotalMilliseconds;
        botUser.IsFinished         = true;
        botUser.FinishedAt         = now;
        botUser.ProgressPercentage = 100;
        botUser.XpGained           = 0; // Bot ödül kazanmaz
        botUser.CoinsGained        = 0;

        await _roomState.CreateRoomAsync(room);

        _logger.LogInformation("🤖 Bot bitti: {Bot} | {C}D {W}Y {B}B | Net: {Net:F1}",
            bot.Username, correct, wrong, blank, botUser.NetScore);

        // Tüm oyuncular (gerçek + bot) bitirdiyse maçı sonlandır
        bool allDone = room.Users.Values.All(u => u.IsFinished);
        if (allDone)
        {
            using var scope2 = _scopeFactory.CreateScope();
            var roomSvc = scope2.ServiceProvider.GetRequiredService<IRoomService>();
            try
            {
                var result = await roomSvc.FinishMatchAsync(roomCode);
                await _hubContext.Clients.Group(roomCode).SendAsync("MatchEnded", result);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("⚠️ Bot-triggered FinishMatch hatası: {Msg}", ex.Message);
            }
        }
    }
}
