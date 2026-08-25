using DuelloLab.Api.DTOs.Auth;

namespace DuelloLab.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto);
    Task<UserDto?> GetUserByIdAsync(Guid userId);
    Task<UserDto> ClaimCoinsAsync(Guid userId, int amount = 100);
}
