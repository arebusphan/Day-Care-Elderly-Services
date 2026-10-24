using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Care log phía nhân viên (role Staff)
/// </summary>
public interface ICareLogService
{
    Task<ApiResponse<List<StaffElderlyTodayDto>>> GetTodayElderlyAsync(Guid userId);
    Task<ApiResponse<List<ActivityTodayDto>>> GetTodayActivitiesAsync(Guid userId);
    Task<ApiResponse<CareLogDayDto>> GetDayAsync(Guid userId, Guid elderlyId, DateOnly? date);
    Task<ApiResponse<CareLogEntryDto>> AddEntryAsync(Guid userId, Guid elderlyId, CreateCareLogEntryDto dto);
    Task<ApiResponse<List<CareLogPhotoDto>>> AddPhotosAsync(Guid userId, Guid careLogId, List<PhotoUploadFile> files);
    Task<ApiResponse<bool>> DeletePhotoAsync(Guid userId, Guid photoId);
    Task<ApiResponse<VitalsResultDto>> RecordVitalsAsync(Guid userId, Guid elderlyId, RecordVitalsDto dto);
    Task<ApiResponse<List<DoseDto>>> GetTodayDosesAsync(Guid userId);
    Task<ApiResponse<DoseDto>> UpdateDoseAsync(Guid userId, Guid medicationRecordId, UpdateDoseDto dto);
    Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(Guid userId, string? status, int days);
    Task<ApiResponse<IncidentDto>> CreateIncidentAsync(Guid userId, CreateIncidentDto dto);
    Task<ApiResponse<IncidentDto>> UpdateIncidentAsync(Guid userId, Guid incidentId, UpdateIncidentDto dto);
    Task<ApiResponse<CareLogDayDto>> MarkMedicalDoneAsync(Guid userId, Guid elderlyId, CareLogNoteDto dto);
    Task<ApiResponse<CareLogDayDto>> CloseDayAsync(Guid userId, Guid elderlyId, CareLogNoteDto dto);
}
