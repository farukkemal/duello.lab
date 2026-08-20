namespace DuelloLab.Api.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int Level { get; set; } = 1;
    public int XP { get; set; } = 0;
    public int CoinBalance { get; set; } = 100;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<UserResult> UserResults { get; set; } = new List<UserResult>();
}
