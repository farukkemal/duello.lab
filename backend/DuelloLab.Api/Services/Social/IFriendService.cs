using DuelloLab.Api.DTOs.Social;

namespace DuelloLab.Api.Services.Social;

public interface IFriendService
{
    Task<PendingFriendRequestDto> SendFriendRequestAsync(Guid requesterId, string targetUsername);
    Task<bool> RespondFriendRequestAsync(Guid userId, Guid friendshipId, bool accept);
    Task<List<FriendDto>> GetFriendsListAsync(Guid userId);
    Task<List<PendingFriendRequestDto>> GetPendingRequestsAsync(Guid userId);
    Task<bool> RemoveFriendAsync(Guid userId, Guid friendshipId);
}
