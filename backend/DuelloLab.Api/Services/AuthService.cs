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
        JokerEliminateThree = user.JokerEliminateThree,
        JokerDoubleChance = user.JokerDoubleChance,
        JokerExtraTime = user.JokerExtraTime
    };
}
