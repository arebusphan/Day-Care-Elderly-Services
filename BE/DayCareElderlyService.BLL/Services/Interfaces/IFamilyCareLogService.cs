using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.DTOs.Schedule;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Care log phía gia đình (role FamilyMember): chỉ xem, ẩn mục nội bộ
/// </summary>
public interface IFamilyCareLogService
{
    Task<ApiResponse<CareLogDayDto>> GetDayAsync(int userId, int elderlyId, DateOnly? date);
    Task<ApiResponse<List<CareLogDaySummaryDto>>> GetHistoryAsync(int userId, int elderlyId, DateOnly? from, DateOnly? to);
    Task<ApiResponse<List<CareLogDayDto>>> GetTimelineAsync(int userId, int elderlyId, int days);
    Task<ApiResponse<HealthHistoryDto>> GetHealthAsync(int userId, int elderlyId, int days);
    Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(int userId, int days);
    /// <summary>Lịch hoạt động theo gói của cụ trong ngày, kèm trạng thái (ẩn ghi chú nội bộ)</summary>
    Task<ApiResponse<ScheduleDayDto>> GetScheduleAsync(int userId, int elderlyId, DateOnly? date);
}
