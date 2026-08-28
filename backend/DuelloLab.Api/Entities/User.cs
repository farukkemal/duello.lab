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
    public string Role { get; set; } = "User"; // "User" | "Admin"
    public bool IsBanned { get; set; } = false;
    public string Avatar { get; set; } = "default";
    public string Title { get; set; } = "Savaşçı";
    public string Bio { get; set; } = string.Empty;

    // Jokers Inventory
    public int JokerEliminateThree { get; set; } = 1;
    public int JokerDoubleChance { get; set; } = 1;
    public int JokerExtraTime { get; set; } = 1;

    // Navigation
    public ICollection<UserResult> UserResults { get; set; } = new List<UserResult>();
}
