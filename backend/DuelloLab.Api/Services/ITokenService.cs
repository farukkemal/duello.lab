using DuelloLab.Api.Entities;

namespace DuelloLab.Api.Services;

public interface ITokenService
{
    string CreateToken(User user);
    string CreateStartToken(Guid examId, Guid userId);
    (Guid examId, Guid userId, DateTime startedAt)? ValidateStartToken(string token);
}
