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
    private readonly IBotService _botService;

    public RoomController(IRoomService roomService, IBattlegroundService battlegroundService, IBotService botService)
    {
        _roomService = roomService;
        _battlegroundService = battlegroundService;
        _botService = botService;
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

    [HttpPost("bot-room")]
    public async Task<ActionResult<object>> CreateBotRoom([FromBody] CreateBotRoomDto dto)
    {
        if (dto.BotDifficulties == null || dto.BotDifficulties.Count == 0)
            return BadRequest(new { error = "En az 1 bot ekleyin." });
        if (dto.BotDifficulties.Count > 4)
            return BadRequest(new { error = "En fazla 4 bot ekleyebilirsiniz." });

        var roomCode = await _botService.CreateBotRoomAsync(GetUserId(), GetUsername(), new CreateBotRoomRequest
        {
            Category       = dto.Category,
            QuestionCount  = dto.QuestionCount,
            BotDifficulties = dto.BotDifficulties
        });

        var room = await _roomService.GetRoomByCodeAsync(roomCode);
        return Ok(room);
    }

    [HttpGet("{roomCode}")]
    public async Task<ActionResult<RoomResponseDto>> GetRoom(string roomCode)
    {
        var result = await _roomService.GetRoomByCodeAsync(roomCode);
        if (result == null)
            return NotFound(new { error = "Oda bulunamadı veya süresi dolmuş." });
        return Ok(result);
    }

    [HttpGet("{roomCode}/leaderboard")]
    public async Task<ActionResult<MatchEndedDto>> GetLeaderboard(string roomCode)
    {
        var result = await _roomService.GetRoomLeaderboardAsync(roomCode);
        return Ok(result);
    }

    [HttpGet("{roomCode}/review")]
    public async Task<ActionResult<object>> GetRoomReview(string roomCode)
    {
        var result = await _roomService.GetRoomReviewAsync(GetUserId(), roomCode);
        if (result == null)
            return NotFound(new { error = "Oda analizine ulaşılamadı." });
        return Ok(result);
    }

    [HttpPost("join")]
    public async Task<ActionResult<RoomResponseDto>> JoinRoom([FromBody] JoinRoomDto dto)
    {
        var result = await _roomService.JoinRoomAsync(GetUserId(), dto.RoomCode);
        return Ok(result);
    }
}

