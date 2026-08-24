using System.Collections.Concurrent;
using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Hubs;
using DuelloLab.Api.Models.Realtime;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Realtime;

public class MatchmakingService : IMatchmakingService, IHostedService
{
    private readonly ConcurrentDictionary<string, QueuedPlayer> _queue = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRoomStateService _roomStateService;
    private readonly IHubContext<DuelloHub> _hubContext;
    private readonly ILogger<MatchmakingService> _logger;
    private Timer? _matchTimer;

    private static readonly string[] BotNames = 
    {
        "DereceHedefleyen", "YksSimyacisi", "MatematikAslanı", "FenKrali", 
        "CografyaKaptani", "GeometriUstasi", "LimitTurevEntegre", "ParagrafAvcisi", 
        "HacettepeTipYolcusu", "BounBogaziciAdayi"
    };

    public MatchmakingService(
        IServiceScopeFactory scopeFactory,
        IRoomStateService roomStateService,
        IHubContext<DuelloHub> hubContext,
        ILogger<MatchmakingService> logger)
    {
        _scopeFactory = scopeFactory;
        _roomStateService = roomStateService;
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("⚡ MatchmakingService başlatıldı.");
        _matchTimer = new Timer(async _ => await ProcessMatchmakingLoop(), null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(1));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _matchTimer?.Change(Timeout.Infinite, 0);
        return Task.CompletedTask;
    }

    public Task<bool> EnqueueAsync(QueuedPlayer player)
    {
        _queue[player.UserId] = player;
        _logger.LogInformation("📥 Oyuncu kuyruğa girdi: {Username} (Mod: {Mode}, Kat: {Cat})", player.Username, player.Mode, player.Category);
        return Task.FromResult(true);
    }

    public Task<bool> DequeueAsync(string userId)
    {
        var removed = _queue.TryRemove(userId, out _);
        return Task.FromResult(removed);
    }

    public Task<int> GetQueueCountAsync(GameMode mode, string category)
    {
        var count = _queue.Values.Count(p => p.Mode == mode && p.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(count);
    }

    private async Task ProcessMatchmakingLoop()
    {
        try
        {
            var groups = _queue.Values
                .GroupBy(p => new { p.Mode, p.Category })
                .ToList();

            foreach (var group in groups)
            {
                int requiredPlayers = group.Key.Mode == GameMode.Squad2v2 ? 4 : 2;
                var candidates = group.OrderBy(p => p.EnqueuedAt).ToList();

                // 1. Match real human players
                while (candidates.Count >= requiredPlayers)
                {
                    var matchedPlayers = candidates.Take(requiredPlayers).ToList();
                    candidates = candidates.Skip(requiredPlayers).ToList();

                    foreach (var p in matchedPlayers)
                    {
                        _queue.TryRemove(p.UserId, out _);
                    }

                    await CreateMatchedRoomAndNotify(matchedPlayers, group.Key.Mode, group.Key.Category);
                }

                // 2. Smart AI Bot matching for players waiting > 4 seconds
                var now = DateTime.UtcNow;
                foreach (var waitingPlayer in candidates)
                {
                    if (now - waitingPlayer.EnqueuedAt >= TimeSpan.FromSeconds(4))
                    {
                        if (_queue.TryRemove(waitingPlayer.UserId, out _))
                        {
                            var botPlayer = GenerateAiBotPlayer(waitingPlayer.Mode, waitingPlayer.Category, waitingPlayer.Level);
                            var matchGroup = new List<QueuedPlayer> { waitingPlayer, botPlayer };
                            await CreateMatchedRoomAndNotify(matchGroup, group.Key.Mode, group.Key.Category);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Matchmaking döngüsünde hata oluştu.");
        }
    }

    private QueuedPlayer GenerateAiBotPlayer(GameMode mode, string category, int playerLevel)
    {
        var rand = new Random();
        var name = BotNames[rand.Next(BotNames.Length)];
        var botLevel = Math.Max(1, playerLevel + rand.Next(-1, 3));

        return new QueuedPlayer
        {
            UserId = $"BOT_{Guid.NewGuid():N}",
            Username = $"🤖 {name}",
            Level = botLevel,
            ConnectionId = string.Empty,
            Mode = mode,
            Category = category,
            EnqueuedAt = DateTime.UtcNow
        };
    }

    private async Task CreateMatchedRoomAndNotify(List<QueuedPlayer> players, GameMode mode, string category)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Generate 4-char Room Code
        var roomCode = Guid.NewGuid().ToString("N")[..4].ToUpper();

        int qCount = mode switch
        {
            GameMode.SuddenDeath => 5,
            GameMode.Squad2v2 => 5,
            _ => 3
        };

        var questionsDb = await db.Questions
            .Include(q => q.Exam)
            .Where(q => q.Exam.Category.ToUpper() == category.ToUpper())
            .OrderBy(r => EF.Functions.Random())
            .Take(qCount)
            .ToListAsync();

        if (questionsDb.Count == 0)
        {
            questionsDb = await db.Questions
                .Include(q => q.Exam)
                .OrderBy(r => EF.Functions.Random())
                .Take(qCount)
                .ToListAsync();
        }

        var host = players.First();
        var modeTitle = mode switch
        {
            GameMode.Ranked1v1 => "Dereceli 1v1 Düello",
            GameMode.SuddenDeath => "Ani Ölüm Sınavı",
            GameMode.Squad2v2 => "2v2 Takım Savaşı",
            _ => "Hızlı Eşleşme"
        };

        var roomState = new RoomState
        {
            RoomCode = roomCode,
            Title = $"{modeTitle} #{roomCode}",
            Category = category,
            Mode = mode,
            HostUserId = host.UserId,
            HostUsername = host.Username,
            QuestionCount = questionsDb.Count,
            QuestionIds = questionsDb.Select(q => q.Id).ToList(),
            Questions = questionsDb.Select(q => new SoloQuestionDto
            {
                Id = q.Id,
                Branch = q.Branch,
                QuestionText = q.QuestionText,
                Choices = q.Choices,
                ImageUrl = q.ImageUrl
            }).ToList(),
            Status = RoomStatus.Waiting,
            MaxPlayers = players.Count,
            CreatedAt = DateTime.UtcNow,
            DurationSeconds = mode == GameMode.SuddenDeath ? 75 : 180
        };

        for (int i = 0; i < players.Count; i++)
        {
            var p = players[i];
            roomState.Users[p.UserId] = new RoomUserInfo
            {
                UserId = p.UserId,
                Username = p.Username,
                Level = p.Level,
                ConnectionId = p.ConnectionId,
                IsHost = i == 0,
                IsReady = true, // Auto ready for quick play
                Team = (mode == GameMode.Squad2v2 && i >= 2) ? "Blue" : "Red"
            };
        }

        await _roomStateService.CreateRoomAsync(roomState);

        _logger.LogInformation("🎉 Eşleşme tamamlandı! Oda: {RoomCode} ({Mode}) Oyuncular: {Count}",
            roomCode, mode, players.Count);

        // Notify human players via MatchFound SignalR event
        foreach (var p in players)
        {
            if (string.IsNullOrEmpty(p.ConnectionId)) continue; // Skip bot

            var opponent = players.FirstOrDefault(other => other.UserId != p.UserId);

            await _hubContext.Clients.Client(p.ConnectionId).SendAsync("MatchFound", new MatchFoundDto
            {
                RoomCode = roomCode,
                Mode = mode,
                Category = category,
                OpponentUsername = opponent?.Username ?? "Rakip",
                OpponentLevel = opponent?.Level ?? 1
            });
        }

        // If bot exists, trigger simulated solver
        var botPlayer = players.FirstOrDefault(p => p.UserId.StartsWith("BOT_"));
        if (botPlayer != null)
        {
            _ = Task.Run(() => SimulateBotProgressAsync(roomCode, botPlayer, questionsDb.Count));
        }
    }

    private async Task SimulateBotProgressAsync(string roomCode, QueuedPlayer bot, int totalQuestions)
    {
        try
        {
            // Wait for 3-2-1 countdown + first question thinking
            await Task.Delay(4500);

            var rand = new Random();
            for (int i = 0; i < totalQuestions; i++)
            {
                // Think time between 3.5s and 6.5s per question
                await Task.Delay(rand.Next(3500, 6500));

                var progressData = new PlayerProgressDto
                {
                    UserId = bot.UserId,
                    Username = bot.Username,
                    CurrentQuestionIndex = i,
                    AnsweredCount = i + 1,
                    ProgressPercentage = totalQuestions > 0 ? (int)Math.Round(((double)(i + 1) / totalQuestions) * 100) : 0,
                    Team = bot.Mode == GameMode.Squad2v2 ? "Blue" : "Red"
                };

                await _hubContext.Clients.Group(roomCode).SendAsync("PlayerProgressUpdated", progressData);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Bot simülasyonu sonlandı: {BotName}", bot.Username);
        }
    }
}
