using System.Security.Claims;
using DuelloLab.Api.DTOs.Auth;
using DuelloLab.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        var result = await _authService.RegisterAsync(dto);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        var result = await _authService.LoginAsync(dto);
        return Ok(result);
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> GoogleAuth([FromBody] GoogleAuthDto dto)
    {
        var result = await _authService.GoogleAuthAsync(dto);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.GetUserByIdAsync(userId);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.UpdateProfileAsync(userId, dto);
        return Ok(user);
    }

    [Authorize]
    [HttpGet("profile/{identifier}")]
    public async Task<ActionResult<PublicProfileDto>> GetPublicProfile(string identifier)
    {
        var profile = await _authService.GetPublicProfileAsync(identifier);
        if (profile == null) return NotFound("Kullanıcı profili bulunamadı.");
        return Ok(profile);
    }

    [Authorize]
    [HttpPost("claim-coins")]
    public async Task<ActionResult<UserDto>> ClaimCoins()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.ClaimCoinsAsync(userId, 100);
        return Ok(user);
    }
}
