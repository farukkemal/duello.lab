using System.Security.Claims;
using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Controllers;

public class BuyPackDto
{
    public string PackId { get; set; } = string.Empty;
}

public class BuyItemDto
{
    public string ItemId { get; set; } = string.Empty;
}

public class UseJokerDto
{
    public string JokerType { get; set; } = string.Empty; // "eliminate_three" | "double_chance" | "extra_time"
    public Guid? QuestionId { get; set; }
}

public class UseJokerResponseDto
{
    public UserDto User { get; set; } = null!;
    public List<string> EliminatedChoices { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public class StoreProductDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "coins"; // "coins" | "joker" | "cosmetic"
    public int CoinAmount { get; set; }
    public int BonusCoins { get; set; }
    public decimal PriceTry { get; set; }
    public int CostCoins { get; set; }
    public string Icon { get; set; } = "💰";
    public string Description { get; set; } = string.Empty;
    public string Tag { get; set; } = string.Empty;
}

public class DailyChestResponseDto
{
    public int CoinsWon { get; set; }
    public int XpWon { get; set; }
    public string Message { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StoreController : ControllerBase
{
    private readonly AppDbContext _db;

    public StoreController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    [HttpGet("products")]
    public ActionResult<List<StoreProductDto>> GetProducts()
    {
        var products = new List<StoreProductDto>
        {
            // COIN PACKS
            new()
            {
                Id = "pack_starter",
                Name = "Çaylak Kesesi",
                Category = "coins",
                CoinAmount = 100,
                BonusCoins = 0,
                PriceTry = 0,
                Icon = "🪙",
                Description = "Günde 1 kez ücretsiz alınabilir test paketi.",
                Tag = "ÜCRETSİZ"
            },
            new()
            {
                Id = "pack_warrior",
                Name = "Savaşçı Torbası",
                Category = "coins",
                CoinAmount = 250,
                BonusCoins = 25,
                PriceTry = 29.99m,
                Icon = "💰",
                Description = "Özel düello odaları kurmak ve joker stoklamak için ideal paket.",
                Tag = "POPÜLER"
            },
            new()
            {
                Id = "pack_gladiator",
                Name = "Gladyatör Sandığı",
                Category = "coins",
                CoinAmount = 600,
                BonusCoins = 100,
                PriceTry = 59.99m,
                Icon = "💎",
                Description = "Büyük turnuva paketinde %20 ekstra bonus coin.",
                Tag = "%20 BONUS"
            },
            new()
            {
                Id = "pack_champion",
                Name = "Şampiyon Kasası",
                Category = "coins",
                CoinAmount = 1500,
                BonusCoins = 300,
                PriceTry = 119.99m,
                Icon = "👑",
                Description = "En yüksek değer! Sınırsız düellolar ve +300 bonus coin.",
                Tag = "EN İYİ FİYAT"
            },

            // JOKERS (DÜELLO JOKERLERİ)
            new()
            {
                Id = "joker_eliminate_three",
                Name = "3 Şık Eleme Jokeri",
                Category = "joker",
                CostCoins = 40,
                Icon = "🎯",
                Description = "Sorudaki 3 yanlış şıkkı anında eler, geriye 1 doğru 1 yanlış şık bırakır.",
                Tag = "JOKER"
            },
            new()
            {
                Id = "joker_double_chance",
                Name = "Çift Cevap Hakkı Jokeri",
                Category = "joker",
                CostCoins = 50,
                Icon = "✌️",
                Description = "Aynı soruda 2 farklı şık seçmene izin verir. Biri doğruysa soru tam doğru sayılır!",
                Tag = "JOKER"
            },
            new()
            {
                Id = "joker_extra_time",
                Name = "+15 Sn Ekstra Süre Jokeri",
                Category = "joker",
                CostCoins = 35,
                Icon = "⏳",
                Description = "Kullandığın an düello sürene sadece senin için +15 saniye ekler.",
                Tag = "SÜRE"
            }
        };

        return Ok(products);
    }

    [HttpPost("buy-pack")]
    public async Task<ActionResult<UserDto>> BuyPack([FromBody] BuyPackDto dto)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("Kullanıcı bulunamadı.");

        int coinsToAdd = dto.PackId switch
        {
            "pack_starter" => 100,
            "pack_warrior" => 275,
            "pack_gladiator" => 700,
            "pack_champion" => 1800,
            _ => 100
        };

        user.CoinBalance += coinsToAdd;
        await _db.SaveChangesAsync();

        return Ok(MapToUserDto(user));
    }

    [HttpPost("buy-item")]
    public async Task<ActionResult<UserDto>> BuyItem([FromBody] BuyItemDto dto)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("Kullanıcı bulunamadı.");

        int cost;
        switch (dto.ItemId)
        {
            case "joker_eliminate_three":
                cost = 40;
                if (user.CoinBalance < cost) return BadRequest($"Yetersiz bakiye! Bu joker için {cost} Coin gereklidir.");
                user.JokerEliminateThree++;
                break;

            case "joker_double_chance":
                cost = 50;
                if (user.CoinBalance < cost) return BadRequest($"Yetersiz bakiye! Bu joker için {cost} Coin gereklidir.");
                user.JokerDoubleChance++;
                break;

            case "joker_extra_time":
                cost = 35;
                if (user.CoinBalance < cost) return BadRequest($"Yetersiz bakiye! Bu joker için {cost} Coin gereklidir.");
                user.JokerExtraTime++;
                break;

            case "item_xp_boost":
                cost = 50;
                if (user.CoinBalance < cost) return BadRequest($"Yetersiz bakiye! Bu eşya için {cost} Coin gereklidir.");
                break;

            case "item_shield":
                cost = 75;
                if (user.CoinBalance < cost) return BadRequest($"Yetersiz bakiye! Bu eşya için {cost} Coin gereklidir.");
                break;

            default:
                return BadRequest("Geçersiz ürün.");
        }

        user.CoinBalance -= cost;
        user.XP += 15; // Joker purchase gives +15 XP bonus
        user.Level = (user.XP / 1000) + 1;

        await _db.SaveChangesAsync();

        return Ok(MapToUserDto(user));
    }

    [HttpPost("use-joker")]
    public async Task<ActionResult<UseJokerResponseDto>> UseJoker([FromBody] UseJokerDto dto)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("Kullanıcı bulunamadı.");

        var eliminatedChoices = new List<string>();
        var jokerType = (dto.JokerType ?? string.Empty).Trim().ToLowerInvariant();

        switch (jokerType)
        {
            case "eliminate_three":
            case "joker_eliminate_three":
                if (user.JokerEliminateThree <= 0)
                {
                    return BadRequest("Yetersiz joker! Mağazadan '3 Şık Eleme' jokeri satın almalısınız.");
                }

                if (dto.QuestionId.HasValue)
                {
                    var q = await _db.Questions.FirstOrDefaultAsync(x => x.Id == dto.QuestionId.Value);
                    if (q != null && q.Choices != null && q.Choices.Count > 2)
                    {
                        var correctKey = (q.CorrectAnswer ?? "").Trim().ToUpperInvariant();
                        var wrongKeys = q.Choices.Keys
                            .Where(k => !k.Trim().Equals(correctKey, StringComparison.OrdinalIgnoreCase))
                            .Select(k => k.Trim().ToUpperInvariant())
                            .OrderBy(_ => Guid.NewGuid())
                            .Take(Math.Min(3, q.Choices.Count - 2))
                            .ToList();
                        eliminatedChoices = wrongKeys;
                    }
                }

                user.JokerEliminateThree = Math.Max(0, user.JokerEliminateThree - 1);
                break;

            case "double_chance":
            case "joker_double_chance":
                if (user.JokerDoubleChance <= 0)
                {
                    return BadRequest("Yetersiz joker! Mağazadan 'Çift Cevap Hakkı' jokeri satın almalısınız.");
                }
                user.JokerDoubleChance = Math.Max(0, user.JokerDoubleChance - 1);
                break;

            case "extra_time":
            case "joker_extra_time":
                if (user.JokerExtraTime <= 0)
                {
                    return BadRequest("Yetersiz joker! Mağazadan 'Ekstra Süre' jokeri satın almalısınız.");
                }
                user.JokerExtraTime = Math.Max(0, user.JokerExtraTime - 1);
                break;

            default:
                return BadRequest("Geçersiz joker tipi.");
        }

        await _db.SaveChangesAsync();
        return Ok(new UseJokerResponseDto
        {
            User = MapToUserDto(user),
            EliminatedChoices = eliminatedChoices,
            Message = "Joker başarıyla kullanıldı."
        });
    }

    [HttpPost("daily-chest")]
    public async Task<ActionResult<DailyChestResponseDto>> OpenDailyChest()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound("Kullanıcı bulunamadı.");

        // Random prize: 50-150 Coins and 50-100 XP
        var random = new Random();
        int coinsWon = random.Next(50, 151);
        int xpWon = random.Next(50, 101);

        user.CoinBalance += coinsWon;
        user.XP += xpWon;
        user.Level = (user.XP / 1000) + 1;

        await _db.SaveChangesAsync();

        return Ok(new DailyChestResponseDto
        {
            CoinsWon = coinsWon,
            XpWon = xpWon,
            Message = $"Tebrikler! Günlük Sandıktan {coinsWon} Coin ve +{xpWon} XP kazandınız!",
            User = MapToUserDto(user)
        });
    }

    private static UserDto MapToUserDto(Entities.User u) => new()
    {
        Id = u.Id,
        Username = u.Username,
        Email = u.Email,
        Level = u.Level,
        XP = u.XP,
        CoinBalance = u.CoinBalance,
        CreatedAt = u.CreatedAt,
        Role = u.Role,
        IsBanned = u.IsBanned,
        JokerEliminateThree = u.JokerEliminateThree,
        JokerDoubleChance = u.JokerDoubleChance,
        JokerExtraTime = u.JokerExtraTime
    };
}
