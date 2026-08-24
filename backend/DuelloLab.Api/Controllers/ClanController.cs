using System.Security.Claims;
using DuelloLab.Api.DTOs.Social;
using DuelloLab.Api.Services.Social;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ClanController : ControllerBase
{
    private readonly IClanService _clanService;

    public ClanController(IClanService clanService)
    {
        _clanService = clanService;
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
}
