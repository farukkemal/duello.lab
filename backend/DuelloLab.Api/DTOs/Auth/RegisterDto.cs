using System.ComponentModel.DataAnnotations;

namespace DuelloLab.Api.DTOs.Auth;

public class RegisterDto
{
    [Required]
    [MinLength(3)]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;
}
