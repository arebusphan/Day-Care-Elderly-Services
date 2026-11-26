using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Schedule;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>Lịch hoạt động mẫu theo gói (PackageActivities) — role Center / Admin</summary>
public interface IPackageActivityService
{
    Task<ApiResponse<List<PackageScheduleSummaryDto>>> GetPackagesAsync();
    Task<ApiResponse<List<PackageActivityDto>>> GetActivitiesAsync(int packageId, bool includeInactive);
    Task<ApiResponse<PackageActivityDto>> CreateAsync(int userId, int packageId, UpsertPackageActivityDto dto);
    Task<ApiResponse<PackageActivityDto>> UpdateAsync(int userId, int packageActivityId, UpsertPackageActivityDto dto);
    Task<ApiResponse<PackageActivityDto>> SetActiveAsync(int userId, int packageActivityId, bool isActive);
}
