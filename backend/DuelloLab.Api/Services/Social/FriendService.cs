using DuelloLab.Api.Data;
using DuelloLab.Api.DTOs.Social;
using DuelloLab.Api.Entities;
using DuelloLab.Api.Services.Realtime;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Services.Social;

public class FriendService : IFriendService
{
    private readonly AppDbContext _db;
    private readonly IRoomStateService _roomStateService;
    private readonly ILogger<FriendService> _logger;

    public FriendService(
        AppDbContext db,
        IRoomStateService roomStateService,
        ILogger<FriendService> logger)
    {
        _db = db;
        _roomStateService = roomStateService;
        _logger = logger;
    }

    public async Task<PendingFriendRequestDto> SendFriendRequestAsync(Guid requesterId, string targetUsername)
    {
        var requester = await _db.Users.FindAsync(requesterId);
        if (requester == null) throw new InvalidOperationException("Kullanıcı bulunamadı.");

        var target = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == targetUsername.Trim().ToLower());
        if (target == null) throw new InvalidOperationException($"'{targetUsername}' kullanıcı adına sahip bir oyuncu bulunamadı.");

        if (target.Id == requesterId)
            throw new InvalidOperationException("Kendinize arkadaşlık isteği gönderemezsiniz.");

        var existing = await _db.Friendships.FirstOrDefaultAsync(f =>
            (f.RequesterId == requesterId && f.AddresseeId == target.Id) ||
            (f.RequesterId == target.Id && f.AddresseeId == requesterId));

        if (existing != null)
        {
            if (existing.Status == FriendshipStatus.Accepted)
                throw new InvalidOperationException("Bu oyuncuyla zaten arkadaşsınız.");
            if (existing.Status == FriendshipStatus.Pending)
                throw new InvalidOperationException("Zaten bekleyen bir arkadaşlık isteği mevcut.");
        }

        var friendship = new Friendship
        {
            RequesterId = requesterId,
            AddresseeId = target.Id,
            Status = FriendshipStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _db.Friendships.Add(friendship);
        await _db.SaveChangesAsync();

        _logger.LogInformation("🤝 Arkadaşlık isteği gönderildi: {From} ➔ {To}", requester.Username, target.Username);

        return new PendingFriendRequestDto
        {
            FriendshipId = friendship.Id,
            RequesterId = requesterId,
            RequesterUsername = requester.Username,
            RequesterLevel = requester.Level,
            SentAt = friendship.CreatedAt
        };
    }

    public async Task<bool> RespondFriendRequestAsync(Guid userId, Guid friendshipId, bool accept)
    {
        var friendship = await _db.Friendships.FindAsync(friendshipId);
        if (friendship == null || friendship.AddresseeId != userId)
            return false;

        friendship.Status = accept ? FriendshipStatus.Accepted : FriendshipStatus.Declined;
        friendship.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("🤝 Arkadaşlık isteği yanıtlandı: ID={Id}, Kabul={Accept}", friendshipId, accept);

        return true;
    }

    public async Task<List<FriendDto>> GetFriendsListAsync(Guid userId)
    {
        var friendships = await _db.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f => f.Status == FriendshipStatus.Accepted && (f.RequesterId == userId || f.AddresseeId == userId))
            .ToListAsync();

        var result = new List<FriendDto>();

        foreach (var f in friendships)
        {
            var otherUser = f.RequesterId == userId ? f.Addressee : f.Requester;
            var conns = await _roomStateService.GetConnectionsByUserIdAsync(otherUser.Id.ToString());
            var isOnline = conns.Count > 0;
            var currentRoom = isOnline ? await _roomStateService.GetUserRoomAsync(otherUser.Id.ToString()) : null;

            result.Add(new FriendDto
            {
                FriendshipId = f.Id,
                UserId = otherUser.Id,
                Username = otherUser.Username,
                Level = otherUser.Level,
                Xp = otherUser.XP,
                IsOnline = isOnline,
                CurrentRoomCode = currentRoom,
                FriendsSince = f.UpdatedAt ?? f.CreatedAt
            });
        }

        return result.OrderByDescending(f => f.IsOnline).ThenBy(f => f.Username).ToList();
    }

    public async Task<List<PendingFriendRequestDto>> GetPendingRequestsAsync(Guid userId)
    {
        var pending = await _db.Friendships
            .Include(f => f.Requester)
            .Where(f => f.Status == FriendshipStatus.Pending && f.AddresseeId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return pending.Select(f => new PendingFriendRequestDto
        {
            FriendshipId = f.Id,
            RequesterId = f.RequesterId,
            RequesterUsername = f.Requester.Username,
            RequesterLevel = f.Requester.Level,
            SentAt = f.CreatedAt
        }).ToList();
    }

    public async Task<bool> RemoveFriendAsync(Guid userId, Guid friendshipId)
    {
        var friendship = await _db.Friendships.FindAsync(friendshipId);
        if (friendship == null || (friendship.RequesterId != userId && friendship.AddresseeId != userId))
            return false;

        _db.Friendships.Remove(friendship);
        await _db.SaveChangesAsync();
        return true;
    }
}
