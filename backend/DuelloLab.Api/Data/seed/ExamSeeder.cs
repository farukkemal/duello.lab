using System.Text.Json;
using System.Text.Json.Serialization;
using DuelloLab.Api.Entities;
using DuelloLab.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Data.Seed;

public static class ExamSeeder
{
    private const string SeedFileName = "tyt-battleground-01.json";

    public static async Task SeedAsync(
        AppDbContext db,
        string contentRootPath)
    {
        var filePath = Path.Combine(
            contentRootPath,
            "Data",
            "Seed",
            SeedFileName);

        if (!File.Exists(filePath))
        {
            Console.WriteLine($"[Seed] Dosya bulunamadı: {filePath}");
            return;
        }

        var json = await File.ReadAllTextAsync(filePath);

        var seedExam = JsonSerializer.Deserialize<SeedExamDto>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

        if (seedExam is null)
        {
            Console.WriteLine("[Seed] JSON okunamadı.");
            return;
        }

        var examAlreadyExists = await db.Exams
            .AnyAsync(e => e.Title == seedExam.ExamTitle);

        if (examAlreadyExists)
        {
            Console.WriteLine(
                $"[Seed] Sınav zaten mevcut: {seedExam.ExamTitle}");
            return;
        }

        var exam = new Exam
        {
            Title = seedExam.ExamTitle,
            Category = seedExam.Category,
            IsActive = true
        };

        foreach (var seedQuestion in seedExam.Questions)
        {
            exam.Questions.Add(new Question
            {
                Branch = seedQuestion.Branch,
                QuestionText = seedQuestion.QuestionText,
                Choices = seedQuestion.Choices,
                CorrectAnswer = seedQuestion.CorrectAnswer.ToUpperInvariant(),
                SolutionText = seedQuestion.SolutionText,
                ImageUrl = seedQuestion.ImageUrl,
                PoolType = PoolType.Battleground
            });
        }

        db.Exams.Add(exam);
        await db.SaveChangesAsync();

        Console.WriteLine(
            $"[Seed] {exam.Title} eklendi. " +
            $"Soru sayısı: {exam.Questions.Count}");
    }

    private sealed class SeedExamDto
    {
        [JsonPropertyName("exam_title")]
        public string ExamTitle { get; set; } = string.Empty;

        [JsonPropertyName("category")]
        public string Category { get; set; } = string.Empty;

        [JsonPropertyName("questions")]
        public List<SeedQuestionDto> Questions { get; set; } = [];
    }

    private sealed class SeedQuestionDto
    {
        [JsonPropertyName("question_id")]
        public string QuestionId { get; set; } = string.Empty;

        [JsonPropertyName("branch")]
        public string Branch { get; set; } = string.Empty;

        [JsonPropertyName("question_text")]
        public string QuestionText { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public Dictionary<string, string> Choices { get; set; } = [];

        [JsonPropertyName("correct_answer")]
        public string CorrectAnswer { get; set; } = string.Empty;

        [JsonPropertyName("solution_text")]
        public string? SolutionText { get; set; }

        [JsonPropertyName("image_url")]
        public string? ImageUrl { get; set; }
    }
}