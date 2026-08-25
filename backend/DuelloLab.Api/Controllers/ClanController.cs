using System.Security.Claims;
using DuelloLab.Api.DTOs.Social;
using DuelloLab.Api.Hubs;
using DuelloLab.Api.Services.Social;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace DuelloLab.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ClanController : ControllerBase
{
    private readonly IClanService _clanService;
    private readonly IHubContext<DuelloHub> _hubContext;

    public ClanController(IClanService clanService, IHubContext<DuelloHub> hubContext)
    {
        _clanService = clanService;
        _hubContext = hubContext;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpPost("create")]
    public async Task<ActionResult<ClanDto>> CreateClan([FromBody] CreateClanDto dto)
    {
        var result = await _clanService.CreateClanAsync(GetUserId(), dto);
        return Ok(result);
    }

    [HttpPost("{clanId}/join")]
    public async Task<ActionResult<ClanDto>> JoinClan(Guid clanId)
    {
        var result = await _clanService.JoinClanAsync(GetUserId(), clanId);
        return Ok(result);
    }

    [HttpPost("{clanId}/leave")]
    public async Task<ActionResult> LeaveClan(Guid clanId)
    {
        var result = await _clanService.LeaveClanAsync(GetUserId(), clanId);
        return result ? Ok(new { message = "Klandan ayrıldınız." }) : BadRequest("Klandan ayrılamadınız.");
    }

    [HttpGet("my-clan")]
    public async Task<ActionResult<ClanDto?>> GetMyClan()
    {
        var clan = await _clanService.GetUserClanAsync(GetUserId());
        return Ok(clan);
    }

    [HttpGet("{clanId}")]
    public async Task<ActionResult<ClanDto>> GetClan(Guid clanId)
    {
        var clan = await _clanService.GetClanByIdAsync(clanId);
        if (clan == null) return NotFound("Klan bulunamadı.");
        return Ok(clan);
    }

    [HttpGet("top")]
    public async Task<ActionResult<List<ClanListItemDto>>> GetTopClans([FromQuery] int limit = 20)
    {
        var list = await _clanService.GetTopClansAsync(limit);
        return Ok(list);
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<ClanListItemDto>>> SearchClans([FromQuery] string q = "")
    {
        var list = await _clanService.SearchClansAsync(q);
        return Ok(list);
    }

    [HttpGet("{clanId}/messages")]
    public async Task<ActionResult<List<ClanMessageDto>>> GetClanMessages(Guid clanId, [FromQuery] int limit = 50)
    {
        try
        {
            var list = await _clanService.GetClanMessagesAsync(GetUserId(), clanId, limit);
            return Ok(list);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{clanId}/messages")]
    public async Task<ActionResult<ClanMessageDto>> SendClanMessage(Guid clanId, [FromBody] SendClanMessageDto dto)
    {
        try
        {
            var message = await _clanService.SendClanMessageAsync(GetUserId(), clanId, dto.Content);
            
            // Broadcast real-time to clan SignalR group
            await _hubContext.Clients.Group($"clan_{clanId}").SendAsync("ClanMessageReceived", message);
            
            return Ok(message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
