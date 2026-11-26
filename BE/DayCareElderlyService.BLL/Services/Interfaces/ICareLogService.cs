using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.DTOs.Schedule;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Care log phía nhân viên (role Staff)
/// </summary>
public interface ICareLogService
{
    Task<ApiResponse<List<StaffElderlyTodayDto>>> GetTodayElderlyAsync(int userId);
    Task<ApiResponse<CareLogDayDto>> GetDayAsync(int userId, int elderlyId, DateOnly? date);
    /// <summary>Lịch hoạt động theo gói của cụ trong ngày + trạng thái từng hoạt động</summary>
    Task<ApiResponse<ScheduleDayDto>> GetScheduleAsync(int userId, int elderlyId, DateOnly? date);
    /// <summary>Tổng kết tuần (T2–T7): số buổi, số phút theo hoạt động</summary>
    Task<ApiResponse<ScheduleWeekDto>> GetScheduleWeekAsync(int userId, int elderlyId, DateOnly? date);
    Task<ApiResponse<CareLogEntryDto>> AddEntryAsync(int userId, int elderlyId, CreateCareLogEntryDto dto);
    /// <summary>Sửa nội dung mục nhật ký do chính mình ghi hôm nay (trước khi chốt ngày)</summary>
    Task<ApiResponse<CareLogEntryDto>> UpdateEntryAsync(int userId, int careLogId, UpdateCareLogEntryDto dto);
    Task<ApiResponse<List<CareLogPhotoDto>>> AddPhotosAsync(int userId, int careLogId, List<PhotoUploadFile> files);
    Task<ApiResponse<bool>> DeletePhotoAsync(int userId, int photoId);
    Task<ApiResponse<VitalsResultDto>> RecordVitalsAsync(int userId, int elderlyId, RecordVitalsDto dto);
    /// <summary>CL-06: xác nhận đã đo chỉ số và xử lý hết liều thuốc tới giờ (MEDICAL_DONE).</summary>
    Task<ApiResponse<CareLogEntryDto>> MarkMedicalDoneAsync(int userId, int elderlyId, CareLogDayActionDto dto);
    /// <summary>CL-06: chốt care log trong ngày (CLOSE); sau khi chốt staff không ghi thêm.</summary>
    Task<ApiResponse<CareLogEntryDto>> CloseDayAsync(int userId, int elderlyId, CareLogDayActionDto dto);
    Task<ApiResponse<List<DoseDto>>> GetTodayDosesAsync(int userId, string? status = null);
    Task<ApiResponse<DoseDto>> UpdateDoseAsync(int userId, int medicationRecordId, UpdateDoseDto dto);
    Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(int userId, string? status, int days);
    Task<ApiResponse<IncidentDto>> CreateIncidentAsync(int userId, CreateIncidentDto dto);
    Task<ApiResponse<IncidentDto>> UpdateIncidentAsync(int userId, int incidentId, UpdateIncidentDto dto);
}
