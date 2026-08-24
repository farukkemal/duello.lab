using System.Security.Claims;
using DuelloLab.Api.DTOs.Social;
using DuelloLab.Api.Services.Social;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FriendController : ControllerBase
{
    private readonly IFriendService _friendService;

    public FriendController(IFriendService friendService)
    {
        _friendService = friendService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpPost("request")]
    public async Task<ActionResult<PendingFriendRequestDto>> SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var result = await _friendService.SendFriendRequestAsync(GetUserId(), dto.TargetUsername);
        return Ok(result);
    }

    [HttpPost("respond")]
    public async Task<ActionResult> RespondRequest([FromBody] RespondFriendRequestDto dto)
    {
        var result = await _friendService.RespondFriendRequestAsync(GetUserId(), dto.FriendshipId, dto.Accept);
        return result ? Ok(new { message = dto.Accept ? "Arkadaşlık isteği kabul edildi." : "İstek reddedildi." }) : BadRequest("İstek bulunamadı.");
    }

    [HttpGet("list")]
    public async Task<ActionResult<List<FriendDto>>> GetFriends()
    {
        var list = await _friendService.GetFriendsListAsync(GetUserId());
        return Ok(list);
    }

    [HttpGet("pending")]
    public async Task<ActionResult<List<PendingFriendRequestDto>>> GetPendingRequests()
    {
        var list = await _friendService.GetPendingRequestsAsync(GetUserId());
        return Ok(list);
    }

    [HttpDelete("{friendshipId}")]
    public async Task<ActionResult> RemoveFriend(Guid friendshipId)
    {
        var result = await _friendService.RemoveFriendAsync(GetUserId(), friendshipId);
        return result ? Ok(new { message = "Arkadaş silindi." }) : BadRequest("İşlem başarısız.");
    }
}
