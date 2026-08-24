using System.Security.Claims;
using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Services.Realtime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DuelloLab.Api.Controllers;

[ApiController]
[Route("api/rooms")]
[Authorize]
public class RoomController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly IBattlegroundService _battlegroundService;

    public RoomController(IRoomService roomService, IBattlegroundService battlegroundService)
    {
        _roomService = roomService;
        _battlegroundService = battlegroundService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string GetUsername() => User.FindFirst(ClaimTypes.Name)?.Value ?? "Savaşçı";

    [HttpPost("create")]
    public async Task<ActionResult<RoomResponseDto>> CreateRoom([FromBody] CreateRoomDto dto)
    {
        var result = await _roomService.CreateRoomAsync(GetUserId(), dto);
        return Ok(result);
    }

    [HttpPost("battleground")]
    public async Task<ActionResult<RoomResponseDto>> CreateBattleground([FromBody] CreateRoomDto dto)
    {
        var result = await _battlegroundService.CreateBattlegroundRoomAsync(
            GetUserId().ToString(),
            GetUsername(),
            dto.Title,
            dto.Category,
            dto.QuestionCount > 0 ? dto.QuestionCount : 9);
        return Ok(result);
    }

    [HttpGet("{roomCode}")]
    public async Task<ActionResult<RoomResponseDto>> GetRoom(string roomCode)
    {
        var result = await _roomService.GetRoomByCodeAsync(roomCode);
        if (result == null)
            return NotFound(new { error = "Oda bulunamadı veya süresi dolmuş." });
        return Ok(result);
    }

    [HttpPost("join")]
    public async Task<ActionResult<RoomResponseDto>> JoinRoom([FromBody] JoinRoomDto dto)
    {
        var result = await _roomService.JoinRoomAsync(GetUserId(), dto.RoomCode);
        return Ok(result);
    }
}
