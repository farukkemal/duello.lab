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
