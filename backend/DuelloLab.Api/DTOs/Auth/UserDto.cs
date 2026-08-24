namespace DuelloLab.Api.DTOs.Auth;

public class UserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Level { get; set; }
    public int XP { get; set; }
    public int CoinBalance { get; set; }
    public DateTime CreatedAt { get; set; }
    public string Role { get; set; } = "User";
    public bool IsBanned { get; set; }
}
