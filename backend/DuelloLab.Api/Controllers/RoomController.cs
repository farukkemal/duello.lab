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

    public RoomController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpPost("create")]
    public async Task<ActionResult<RoomResponseDto>> CreateRoom([FromBody] CreateRoomDto dto)
    {
        var result = await _roomService.CreateRoomAsync(GetUserId(), dto);
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
