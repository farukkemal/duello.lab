using DuelloLab.Api.DTOs.Social;

namespace DuelloLab.Api.Services.Social;

public interface IClanService
{
    Task<ClanDto> CreateClanAsync(Guid userId, CreateClanDto dto);
    Task<ClanDto> JoinClanAsync(Guid userId, Guid clanId);
    Task<bool> LeaveClanAsync(Guid userId, Guid clanId);
    Task<ClanDto?> GetClanByIdAsync(Guid clanId);
    Task<ClanDto?> GetUserClanAsync(Guid userId);
    Task<List<ClanListItemDto>> GetTopClansAsync(int limit = 20);
    Task<List<ClanListItemDto>> SearchClansAsync(string query);
}
