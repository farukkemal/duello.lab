namespace DuelloLab.Api.Services.Realtime;

public interface IBotService
{
    Task<string> CreateBotRoomAsync(Guid userId, string username, CreateBotRoomRequest request);
    Task SimulateBotMatchAsync(string roomCode, List<BotPlayerConfig> bots);
}

public class CreateBotRoomRequest
{
    public string Category { get; set; } = "TYT";
    public int QuestionCount { get; set; } = 5;
    public List<string> BotDifficulties { get; set; } = new(); // e.g. ["berkay","emre","nur"]
}

public class BotPlayerConfig
{
    public string BotId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public double CorrectRate { get; set; }
    public double WrongRate { get; set; }
    public int MinDelayMs { get; set; }
    public int MaxDelayMs { get; set; }
}
