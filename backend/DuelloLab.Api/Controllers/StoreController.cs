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

public class StoreProductDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "coins"; // "coins" | "powerup" | "cosmetic"
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
                Description = "5 özel düello odası kurmak için ideal paket.",
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
                Description = "En yüksek değer! 30 düello odası ve +300 bonus coin.",
                Tag = "EN İYİ FİYAT"
            },

            // POWERUPS
            new()
            {
                Id = "item_xp_boost",
                Name = "2x XP İksiri",
                Category = "powerup",
                CostCoins = 50,
                Icon = "⚡",
                Description = "Çözülen tüm sorularda 1 saat boyunca çift XP kazandırır.",
                Tag = "GÜÇLENDİRME"
            },
            new()
            {
                Id = "item_shield",
                Name = "Puan Kalkanı",
                Category = "powerup",
                CostCoins = 75,
                Icon = "🛡️",
                Description = "Gelecek 1 maçta 1 yanlış cevabın doğruyu götürmesini engeller.",
                Tag = "KORUMA"
            },
            new()
            {
                Id = "item_gold_frame",
                Name = "Altın Gladyatör Çerçevesi",
                Category = "cosmetic",
                CostCoins = 200,
                Icon = "✨",
                Description = "Profiline ve lobi kartına altın ışıltılı özel çerçeve kazandırır.",
                Tag = "KOZMETİK"
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

        int cost = dto.ItemId switch
        {
            "item_xp_boost" => 50,
            "item_shield" => 75,
            "item_gold_frame" => 200,
            _ => 50
        };

        if (user.CoinBalance < cost)
            return BadRequest($"Yetersiz bakiye! Bu eşya için {cost} Coin gereklidir. Bakiyeniz: {user.CoinBalance} Coin.");

        user.CoinBalance -= cost;
        user.XP += 25; // Item purchase gives bonus XP
        user.Level = (user.XP / 1000) + 1;

        await _db.SaveChangesAsync();

        return Ok(MapToUserDto(user));
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
        CreatedAt = u.CreatedAt
    };
}
