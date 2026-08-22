
using DuelloLab.Api.DTOs.Exam;
using DuelloLab.Api.DTOs.Room;

namespace DuelloLab.Api.Services.Realtime;

public interface IRoomService
{
    Task<RoomResponseDto> CreateRoomAsync(Guid userId, CreateRoomDto dto);
    Task<RoomResponseDto?> GetRoomByCodeAsync(string roomCode);
    Task<RoomResponseDto> JoinRoomAsync(Guid userId, string roomCode);
    Task<MatchStartingDto> StartMatchAsync(Guid userId, string roomCode);
    Task<PlayerProgressDto> UpdateProgressAsync(Guid userId, string roomCode, int currentQuestionIndex, int answeredCount, Guid? answeredQuestionId = null, string? selectedChoice = null);
    Task<(MatchPlayerResultDto playerResult, MatchEndedDto? matchEnded)> SubmitMatchAsync(Guid userId, string roomCode, List<AnswerDto> answers);
    Task<MatchEndedDto> FinishMatchAsync(string roomCode);
    Task<MatchEndedDto> ForceTimeUpAsync(string roomCode);
    Task<MatchEndedDto> GetRoomLeaderboardAsync(string roomCode);
}
