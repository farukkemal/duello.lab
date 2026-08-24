using DuelloLab.Api.DTOs.Room;
using DuelloLab.Api.Models.Realtime;

namespace DuelloLab.Api.Services.Realtime;

public interface IBattlegroundService
{
    Task<RoomResponseDto> CreateBattlegroundRoomAsync(string hostUserId, string hostUsername, string title, string category, int questionCount = 9);
    Task<MatchStartingDto> StartBattlegroundMatchAsync(string roomCode);
    Task<ZoneShrunkDto?> ProcessZoneShrinkAsync(string roomCode, int currentQuestionIndex);
    Task<bool> ProcessSuddenDeathAnswerAsync(string roomCode, string userId, string questionId, string? selectedAnswer);
}
