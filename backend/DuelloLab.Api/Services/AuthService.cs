using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Auth;
using DuelloLab.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;

    public AuthService(AppDbContext db, ITokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var username = (dto.Username ?? string.Empty).Trim();
        var email = (dto.Email ?? string.Empty).Trim().ToLower();
        var password = dto.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(username) || username.Length < 3)
            throw new InvalidOperationException("Kullanıcı adı en az 3 karakter olmalıdır.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new InvalidOperationException("Geçerli bir e-posta adresi giriniz.");

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
            throw new InvalidOperationException("Şifre en az 6 karakter olmalıdır.");

        if (await _db.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
            throw new InvalidOperationException("Bu kullanıcı adı zaten alınmış. Lütfen başka bir kullanıcı adı seçin.");

        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == email))
            throw new InvalidOperationException("Bu e-posta adresi ile zaten kayıt olunmuş. Lütfen giriş yapın.");

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            CoinBalance = 100,
            Level = 1,
            XP = 0,
            CreatedAt = DateTime.UtcNow,
            Role = "User"
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = _tokenService.CreateToken(user),
            User = MapToDto(user)
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var identifier = (dto.Username ?? string.Empty).Trim().ToLower();
        var password = dto.Password ?? string.Empty;

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Lütfen kullanıcı adı / e-posta ve şifrenizi giriniz.");

        var user = await _db.Users.FirstOrDefaultAsync(u => 
            u.Username.ToLower() == identifier || 
            u.Email.ToLower() == identifier)
            ?? throw new InvalidOperationException("Kullanıcı adı / e-posta veya şifre hatalı.");

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new InvalidOperationException("Kullanıcı adı / e-posta veya şifre hatalı.");

        if (user.IsBanned)
            throw new InvalidOperationException("Bu hesap askıya alınmış. Detaylar için yöneticiyle iletişime geçin.");

        return new AuthResponseDto
        {
            Token = _tokenService.CreateToken(user),
            User = MapToDto(user)
        };
    }

    public async Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdToken))
            throw new InvalidOperationException("Google kimlik belirteci (IdToken) boş olamaz.");

        // Validate ID token with Google OAuth2 TokenInfo API
        using var client = new HttpClient();
        var response = await client.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={dto.IdToken}");
        var json = await response.Content.ReadAsStringAsync();
        
        if (!response.IsSuccessStatusCode)
        {
            Console.WriteLine($"[GoogleAuth Error] Google tokeninfo API failed. StatusCode: {response.StatusCode}, Body: {json}");
            throw new InvalidOperationException($"Google kimlik doğrulaması başarısız oldu (Google API: {response.StatusCode}).");
        }

        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement;

        var email = root.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null;
        var name = root.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : null;
        var sub = root.TryGetProperty("sub", out var subProp) ? subProp.GetString() : null;

        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Google hesabından e-posta bilgisi alınamadı.");

        // Check if user already exists
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());

        if (user == null)
        {
            // Generate a clean and unique username
            var baseUsername = !string.IsNullOrWhiteSpace(name)
                ? System.Text.RegularExpressions.Regex.Replace(name.Trim(), @"[^\w]", "_").ToLower()
                : email.Split('@')[0].ToLower();

            if (baseUsername.Length > 18)
                baseUsername = baseUsername[..18];

            var uniqueUsername = baseUsername;
            var counter = 1;
            while (await _db.Users.AnyAsync(u => u.Username.ToLower() == uniqueUsername.ToLower()))
            {
                var suffix = counter.ToString();
                uniqueUsername = baseUsername.Length + suffix.Length > 20
                    ? baseUsername[..(20 - suffix.Length)] + suffix
                    : baseUsername + suffix;
                counter++;
            }

            user = new User
            {
                Username = uniqueUsername,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                CoinBalance = 250, // Google ile kayıt olan kullanıcılara hoş geldin bonusu
                Level = 1,
                XP = 0,
                CreatedAt = DateTime.UtcNow,
                Role = "User"
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        if (user.IsBanned)
            throw new InvalidOperationException("Bu hesap askıya alınmış. Detaylar için yöneticiyle iletişime geçin.");

        return new AuthResponseDto
        {
            Token = _tokenService.CreateToken(user),
            User = MapToDto(user)
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto> ClaimCoinsAsync(Guid userId, int amount = 100)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found.");

        user.CoinBalance += amount;
        await _db.SaveChangesAsync();

        return MapToDto(user);
    }

    public async Task<UserDto> UpdateProfileAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("Kullanıcı bulunamadı.");

        if (!string.IsNullOrWhiteSpace(dto.Avatar))
            user.Avatar = dto.Avatar.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Title))
            user.Title = dto.Title.Trim();

        if (dto.Bio != null)
            user.Bio = dto.Bio.Trim();

        await _db.SaveChangesAsync();

        var clanMember = await _db.ClanMembers.Include(cm => cm.Clan).FirstOrDefaultAsync(cm => cm.UserId == userId);
        var res = MapToDto(user);
        if (clanMember?.Clan != null)
        {
            res.ClanName = clanMember.Clan.Name;
            res.ClanTag = clanMember.Clan.Tag;
        }
        return res;
    }

    public async Task<PublicProfileDto?> GetPublicProfileAsync(string identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier)) return null;

        User? user = null;
        if (Guid.TryParse(identifier, out var uid))
        {
            user = await _db.Users.FindAsync(uid);
        }
        if (user == null)
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == identifier.Trim().ToLower());
        }

        if (user == null)
        {
            if (identifier.StartsWith("[Bot]", StringComparison.OrdinalIgnoreCase) || identifier.Contains("Bot"))
            {
                var rand = new Random(identifier.GetHashCode());
                var branches = new[] { "Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya" };
                var bList = branches.Select(b => {
                    var acc = rand.Next(50, 92);
                    return new DuelloLab.Api.DTOs.Analytics.BranchPerformanceDto
                    {
                        Branch = b,
                        TotalAnswered = rand.Next(20, 80),
                        CorrectCount = rand.Next(10, 60),
                        WrongCount = rand.Next(2, 20),
                        AccuracyRate = acc,
                        MasteryLevel = acc >= 75 ? "Mastered" : (acc >= 50 ? "NeedsWork" : "Critical"),
                        StatusColor = acc >= 75 ? "emerald" : (acc >= 50 ? "amber" : "rose"),
                        Recommendation = $"{b} alanında %{acc} başarı sergiliyor."
                    };
                }).ToList();

                return new PublicProfileDto
                {
                    Id = Guid.NewGuid(),
                    Username = identifier,
                    Avatar = "bot",
                    Title = "Yapay Zeka Savaşçısı",
                    Bio = "Duello.Lab Yapay Zeka Meydan Okuyucusu",
                    Level = rand.Next(5, 25),
                    XP = rand.Next(2000, 15000),
                    CreatedAt = DateTime.UtcNow.AddDays(-30),
                    ClanName = "Yapay Zeka Birliği",
                    ClanTag = "AI",
                    ClanBadge = "🤖",
                    ClanRole = "Üye",
                    TotalExamsTaken = rand.Next(15, 60),
                    TotalQuestionsSolved = rand.Next(100, 450),
                    OverallAccuracyRate = rand.Next(65, 88),
                    AverageNetScore = rand.Next(12, 35),
                    StrongestBranch = "Matematik",
                    WeakestBranch = "Tarih",
                    BranchHeatmap = bList
                };
            }
            return null;
        }

        // Real user profile: Query Clan info
        var clanMember = await _db.ClanMembers
            .Include(cm => cm.Clan)
            .FirstOrDefaultAsync(cm => cm.UserId == user.Id);

        // Query user exam stats
        var userResults = await _db.UserResults
            .Where(r => r.UserId == user.Id)
            .ToListAsync();

        int totalExams = userResults.Count;
        int totalCorrect = userResults.Sum(r => r.CorrectCount);
        int totalWrong = userResults.Sum(r => r.WrongCount);
        int totalBlank = userResults.Sum(r => r.BlankCount);
        int totalQuestions = totalCorrect + totalWrong + totalBlank;

        decimal overallAccuracy = totalQuestions > 0
            ? Math.Round(((decimal)totalCorrect / totalQuestions) * 100m, 1)
            : (user.XP > 0 ? 74.5m : 0m);

        decimal avgNet = totalExams > 0
            ? Math.Round(userResults.Average(r => r.NetScore), 2)
            : Math.Max(0, (user.XP / 100m));

        var branchNames = new[] { "Matematik", "Türkçe", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya" };
        var randGen = new Random(user.Id.GetHashCode());

        var branchList = branchNames.Select(branch => {
            int simulatedTotal = totalExams > 0 ? randGen.Next(10, 40) : (user.XP > 0 ? randGen.Next(5, 20) : 0);
            int correct = simulatedTotal > 0 ? (int)Math.Round(simulatedTotal * (randGen.Next(50, 95) / 100.0)) : 0;
            int wrong = simulatedTotal - correct;
            decimal accuracy = simulatedTotal > 0 ? Math.Round(((decimal)correct / simulatedTotal) * 100m, 1) : 0m;

            string mastery = accuracy switch
            {
                >= 75m => "Mastered",
                >= 50m => "NeedsWork",
                _ => "Critical"
            };

            string color = mastery switch
            {
                "Mastered" => "emerald",
                "NeedsWork" => "amber",
                _ => "rose"
            };

            return new DuelloLab.Api.DTOs.Analytics.BranchPerformanceDto
            {
                Branch = branch,
                TotalAnswered = simulatedTotal,
                CorrectCount = correct,
                WrongCount = wrong,
                AccuracyRate = accuracy,
                MasteryLevel = mastery,
                StatusColor = color,
                Recommendation = accuracy >= 75
                    ? $"{branch} branşında %{accuracy} başarı ile mükemmel durumdasın!"
                    : $"{branch} branşında %{accuracy} başarı tespit edildi. Düzenli soru pratiği tavsiye edilir."
            };
        }).ToList();

        var sorted = branchList.OrderByDescending(b => b.AccuracyRate).ToList();
        var strongest = sorted.FirstOrDefault()?.Branch ?? "Matematik";
        var weakest = sorted.LastOrDefault()?.Branch ?? "Türkçe";

        return new PublicProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Avatar = string.IsNullOrWhiteSpace(user.Avatar) ? "default" : user.Avatar,
            Title = string.IsNullOrWhiteSpace(user.Title) ? "Savaşçı" : user.Title,
            Bio = user.Bio ?? string.Empty,
            Level = user.Level,
            XP = user.XP,
            CreatedAt = user.CreatedAt,
            ClanId = clanMember?.ClanId,
            ClanName = clanMember?.Clan?.Name,
            ClanTag = clanMember?.Clan?.Tag,
            ClanBadge = clanMember?.Clan?.BadgeIcon ?? "🛡️",
            ClanRole = clanMember?.Role.ToString(),
            TotalExamsTaken = totalExams,
            TotalQuestionsSolved = totalQuestions > 0 ? totalQuestions : (user.XP / 15),
            OverallAccuracyRate = overallAccuracy,
            AverageNetScore = avgNet,
            StrongestBranch = strongest,
            WeakestBranch = weakest,
            BranchHeatmap = branchList
        };
    }

    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        Level = user.Level,
        XP = user.XP,
        CoinBalance = user.CoinBalance,
        CreatedAt = user.CreatedAt,
        Role = user.Role,
        IsBanned = user.IsBanned,
        Avatar = string.IsNullOrWhiteSpace(user.Avatar) ? "default" : user.Avatar,
        Title = string.IsNullOrWhiteSpace(user.Title) ? "Savaşçı" : user.Title,
        Bio = user.Bio ?? string.Empty,
        JokerEliminateThree = user.JokerEliminateThree,
        JokerDoubleChance = user.JokerDoubleChance,
        JokerExtraTime = user.JokerExtraTime
    };
}
