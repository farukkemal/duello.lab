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
        if (await _db.Users.AnyAsync(u => u.Username == dto.Username))
            throw new InvalidOperationException("Username already exists.");

        if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
            throw new InvalidOperationException("Email already exists.");

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
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
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == dto.Username)
            ?? throw new InvalidOperationException("Invalid username or password.");

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new InvalidOperationException("Invalid username or password.");

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
        
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException("Google kimlik doğrulaması başarısız oldu veya oturum süresi doldu.");

        var json = await response.Content.ReadAsStringAsync();
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
        IsBanned = user.IsBanned
    };
}
