using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DuelloLab.Api.Entities;
using Microsoft.IdentityModel.Tokens;

namespace DuelloLab.Api.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly SymmetricSecurityKey _key;

    public TokenService(IConfiguration config)
    {
        _config = config;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            _config["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured")));
    }

    public string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };

        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = creds,
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public string CreateStartToken(Guid examId, Guid userId)
    {
        var claims = new List<Claim>
        {
            new("examId", examId.ToString()),
            new("userId", userId.ToString()),
            new("startedAt", DateTime.UtcNow.ToString("O"))
        };

        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(6), // Exam must be submitted within 6 hours
            SigningCredentials = creds,
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"]
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public (Guid examId, Guid userId, DateTime startedAt)? ValidateStartToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParams = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _key,
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParams, out _);
            var examId = Guid.Parse(principal.FindFirst("examId")!.Value);
            var userId = Guid.Parse(principal.FindFirst("userId")!.Value);
            var startedAt = DateTime.Parse(principal.FindFirst("startedAt")!.Value).ToUniversalTime();

            return (examId, userId, startedAt);
        }
        catch
        {
            return null;
        }
    }
}
