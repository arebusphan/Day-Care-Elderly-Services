using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Care log phía nhân viên (role Staff)
/// </summary>
public interface ICareLogService
{
    Task<ApiResponse<List<StaffElderlyTodayDto>>> GetTodayElderlyAsync(int userId);
    Task<ApiResponse<List<ActivityTodayDto>>> GetTodayActivitiesAsync(int userId);
    Task<ApiResponse<CareLogDayDto>> GetDayAsync(int userId, int elderlyId, DateOnly? date);
    Task<ApiResponse<CareLogEntryDto>> AddEntryAsync(int userId, int elderlyId, CreateCareLogEntryDto dto);
    Task<ApiResponse<List<CareLogPhotoDto>>> AddPhotosAsync(int userId, int careLogId, List<PhotoUploadFile> files);
    Task<ApiResponse<bool>> DeletePhotoAsync(int userId, int photoId);
    Task<ApiResponse<VitalsResultDto>> RecordVitalsAsync(int userId, int elderlyId, RecordVitalsDto dto);
    Task<ApiResponse<List<DoseDto>>> GetTodayDosesAsync(int userId);
    Task<ApiResponse<DoseDto>> UpdateDoseAsync(int userId, int medicationRecordId, UpdateDoseDto dto);
    Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(int userId, string? status, int days);
    Task<ApiResponse<IncidentDto>> CreateIncidentAsync(int userId, CreateIncidentDto dto);
    Task<ApiResponse<IncidentDto>> UpdateIncidentAsync(int userId, int incidentId, UpdateIncidentDto dto);
    Task<ApiResponse<CareLogDayDto>> MarkMedicalDoneAsync(int userId, int elderlyId, CareLogNoteDto dto);
    Task<ApiResponse<CareLogDayDto>> CloseDayAsync(int userId, int elderlyId, CareLogNoteDto dto);
}
