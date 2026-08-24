using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Social;
using DuelloLab.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Social;

public class ClanService : IClanService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ClanService> _logger;

    public ClanService(AppDbContext db, ILogger<ClanService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ClanDto> CreateClanAsync(Guid userId, CreateClanDto dto)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new InvalidOperationException("Kullanıcı bulunamadı.");

        // Check if user already in a clan
        var existingMembership = await _db.ClanMembers.FirstOrDefaultAsync(cm => cm.UserId == userId);
        if (existingMembership != null)
            throw new InvalidOperationException("Zaten bir klanın üyesisiniz. Yeni klan kurmak için mevcut klanınızdan ayrılmalısınız.");

        // Check if name taken
        var nameExists = await _db.Clans.AnyAsync(c => c.Name.ToLower() == dto.Name.Trim().ToLower());
        if (nameExists)
            throw new InvalidOperationException($"'{dto.Name}' isimli bir klan zaten mevcut.");

        var clan = new Clan
        {
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            Tag = string.IsNullOrWhiteSpace(dto.Tag) ? "YKS" : dto.Tag.Trim().ToUpper(),
            BadgeIcon = string.IsNullOrWhiteSpace(dto.BadgeIcon) ? "🛡️" : dto.BadgeIcon,
            MinLevel = dto.MinLevel > 0 ? dto.MinLevel : 1,
            IsOpen = dto.IsOpen,
            LeaderUserId = user.Id,
            LeaderUsername = user.Username,
            TotalXp = user.XP,
            MemberCount = 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.Clans.Add(clan);

        var member = new ClanMember
        {
            ClanId = clan.Id,
            UserId = user.Id,
            Username = user.Username,
            Level = user.Level,
            XpContributed = user.XP,
            Role = ClanRole.Leader,
            JoinedAt = DateTime.UtcNow
        };

        _db.ClanMembers.Add(member);
        await _db.SaveChangesAsync();

        _logger.LogInformation("🏰 Yeni klan kuruldu: {ClanName} ({Tag}) Lider: {Leader}", clan.Name, clan.Tag, user.Username);

        return await MapToClanDto(clan);
    }

    public async Task<ClanDto> JoinClanAsync(Guid userId, Guid clanId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) throw new InvalidOperationException("Kullanıcı bulunamadı.");

        var existingMembership = await _db.ClanMembers.FirstOrDefaultAsync(cm => cm.UserId == userId);
        if (existingMembership != null)
            throw new InvalidOperationException("Zaten bir klanın üyesisiniz. Başka bir klana katılmak için mevcut klanınızdan ayrılmalısınız.");

        var clan = await _db.Clans.Include(c => c.Members).FirstOrDefaultAsync(c => c.Id == clanId);
        if (clan == null) throw new InvalidOperationException("Klan bulunamadı.");

        if (user.Level < clan.MinLevel)
            throw new InvalidOperationException($"Bu klana katılmak için en az Seviye {clan.MinLevel} olmalısınız.");

        if (!clan.IsOpen)
            throw new InvalidOperationException("Bu klan şu anda yeni üye alımına kapalıdır.");

        var member = new ClanMember
        {
            ClanId = clan.Id,
            UserId = user.Id,
            Username = user.Username,
            Level = user.Level,
            XpContributed = user.XP,
            Role = ClanRole.Member,
            JoinedAt = DateTime.UtcNow
        };

        _db.ClanMembers.Add(member);
        clan.MemberCount++;
        clan.TotalXp += user.XP;

        await _db.SaveChangesAsync();

        _logger.LogInformation("👥 {Username} klana katıldı: {ClanName}", user.Username, clan.Name);

        return await MapToClanDto(clan);
    }

    public async Task<bool> LeaveClanAsync(Guid userId, Guid clanId)
    {
        var member = await _db.ClanMembers.FirstOrDefaultAsync(cm => cm.ClanId == clanId && cm.UserId == userId);
        if (member == null) return false;

        var clan = await _db.Clans.Include(c => c.Members).FirstOrDefaultAsync(c => c.Id == clanId);
        if (clan == null) return false;

        _db.ClanMembers.Remove(member);
        clan.MemberCount = Math.Max(0, clan.MemberCount - 1);
        clan.TotalXp = Math.Max(0, clan.TotalXp - member.XpContributed);

        if (clan.LeaderUserId == userId)
        {
            var nextLeader = clan.Members.FirstOrDefault(m => m.UserId != userId);
            if (nextLeader != null)
            {
                clan.LeaderUserId = nextLeader.UserId;
                clan.LeaderUsername = nextLeader.Username;
                nextLeader.Role = ClanRole.Leader;
            }
            else
            {
                // Clan is empty, delete clan
                _db.Clans.Remove(clan);
            }
        }

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<ClanDto?> GetClanByIdAsync(Guid clanId)
    {
        var clan = await _db.Clans
            .Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == clanId);

        return clan == null ? null : await MapToClanDto(clan);
    }

    public async Task<ClanDto?> GetUserClanAsync(Guid userId)
    {
        var member = await _db.ClanMembers.FirstOrDefaultAsync(cm => cm.UserId == userId);
        if (member == null) return null;

        return await GetClanByIdAsync(member.ClanId);
    }

    public async Task<List<ClanListItemDto>> GetTopClansAsync(int limit = 20)
    {
        var clans = await _db.Clans
            .OrderByDescending(c => c.TotalXp)
            .Take(limit)
            .ToListAsync();

        var result = new List<ClanListItemDto>();
        for (int i = 0; i < clans.Count; i++)
        {
            var c = clans[i];
            result.Add(new ClanListItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Tag = c.Tag,
                BadgeIcon = c.BadgeIcon,
                MinLevel = c.MinLevel,
                IsOpen = c.IsOpen,
                TotalXp = c.TotalXp,
                MemberCount = c.MemberCount,
                Rank = i + 1
            });
        }
        return result;
    }

    public async Task<List<ClanListItemDto>> SearchClansAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return await GetTopClansAsync(20);

        var q = query.Trim().ToLower();
        var clans = await _db.Clans
            .Where(c => c.Name.ToLower().Contains(q) || c.Tag.ToLower().Contains(q))
            .OrderByDescending(c => c.TotalXp)
            .Take(20)
            .ToListAsync();

        return clans.Select((c, idx) => new ClanListItemDto
        {
            Id = c.Id,
            Name = c.Name,
            Description = c.Description,
            Tag = c.Tag,
            BadgeIcon = c.BadgeIcon,
            MinLevel = c.MinLevel,
            IsOpen = c.IsOpen,
            TotalXp = c.TotalXp,
            MemberCount = c.MemberCount,
            Rank = idx + 1
        }).ToList();
    }

    private async Task<ClanDto> MapToClanDto(Clan clan)
    {
        var rank = await _db.Clans.CountAsync(c => c.TotalXp > clan.TotalXp) + 1;

        return new ClanDto
        {
            Id = clan.Id,
            Name = clan.Name,
            Description = clan.Description,
            Tag = clan.Tag,
            BadgeIcon = clan.BadgeIcon,
            MinLevel = clan.MinLevel,
            IsOpen = clan.IsOpen,
            LeaderUserId = clan.LeaderUserId,
            LeaderUsername = clan.LeaderUsername,
            TotalXp = clan.TotalXp,
            MemberCount = clan.MemberCount,
            Rank = rank,
            CreatedAt = clan.CreatedAt,
            Members = clan.Members.OrderByDescending(m => m.XpContributed).Select(m => new ClanMemberDto
            {
                UserId = m.UserId,
                Username = m.Username,
                Level = m.Level,
                XpContributed = m.XpContributed,
                Role = m.Role,
                JoinedAt = m.JoinedAt
            }).ToList()
        };
    }
}
