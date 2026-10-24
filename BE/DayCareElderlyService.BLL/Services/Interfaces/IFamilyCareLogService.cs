using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Care log phía gia đình (role FamilyMember): chỉ xem, ẩn mục nội bộ
/// </summary>
public interface IFamilyCareLogService
{
    Task<ApiResponse<CareLogDayDto>> GetDayAsync(Guid userId, Guid elderlyId, DateOnly? date);
    Task<ApiResponse<List<CareLogDaySummaryDto>>> GetHistoryAsync(Guid userId, Guid elderlyId, DateOnly? from, DateOnly? to);
    Task<ApiResponse<HealthHistoryDto>> GetHealthAsync(Guid userId, Guid elderlyId, int days);
    Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(Guid userId, int days);
}
