using DuelloLab.Api.DTOs.Exam;

namespace DuelloLab.Api.Services;

public interface IExamService
{
    Task<Guid> ImportExamAsync(ExamImportDto dto);
    Task<List<ExamListDto>> GetSoloExamsAsync();
    Task<SoloExamDto> GetSoloExamByIdAsync(Guid examId, Guid userId);
    Task<ExamResultDto> SubmitExamAsync(ExamSubmitDto dto, Guid userId);
}
