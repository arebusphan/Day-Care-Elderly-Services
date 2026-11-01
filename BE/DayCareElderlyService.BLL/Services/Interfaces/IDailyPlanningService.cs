using System;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.DailyPlanning;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IDailyPlanningService
{
    /// <summary>Khởi tạo hoặc lấy plan cho ngày chỉ định</summary>
    Task<ApiResponse<DailyPlanSummaryDto>> GetOrInitPlanAsync(DateOnly date, int centerId);

    // ── Step 1: Attendance Forecast ─────────────────────────────────────
    Task<ApiResponse<AttendanceForecastResultDto>> GetAttendanceForecastAsync(int planId);
    Task<ApiResponse<AttendanceForecastResultDto>> UpdateAttendanceAsync(int planId, UpdateAttendanceDto dto);
    Task<ApiResponse<AttendanceForecastResultDto>> BulkUpdateAttendanceAsync(int planId, BulkUpdateAttendanceDto dto);

    // ── Step 2: Group Arrangement ───────────────────────────────────────
    Task<ApiResponse<GroupArrangementResultDto>> GetGroupArrangementAsync(int planId);
    Task<ApiResponse<GroupArrangementResultDto>> MoveElderlyToGroupAsync(int planId, MoveElderlyToGroupDto dto);
    Task<ApiResponse<GroupArrangementResultDto>> CreateCareGroupAsync(int planId, CreateCareGroupDto dto);
    Task<ApiResponse<GroupArrangementResultDto>> DeleteCareGroupAsync(int planId, int groupId);

    // ── Step 3: Staff Availability ──────────────────────────────────────
    Task<ApiResponse<StaffAvailabilityResultDto>> GetStaffAvailabilityAsync(DateOnly date, int centerId);
    Task<ApiResponse<StaffAvailabilityResultDto>> UpdateStaffAvailabilityAsync(DateOnly date, UpdateStaffAvailabilityDto dto, int centerId);
    Task<ApiResponse<StaffAvailabilityResultDto>> BulkUpdateStaffAvailabilityAsync(DateOnly date, BulkUpdateStaffAvailabilityDto dto, int centerId);

    // ── Step 4: Staff Assignment ────────────────────────────────────────
    Task<ApiResponse<DailySchedulePlanDto>> GenerateAssignmentAsync(int planId, int centerId);
    Task<ApiResponse<DailySchedulePlanDto>> AssignStaffToGroupAsync(int planId, AssignStaffToGroupDto dto);

    // ── Step 5: Review & Publish ────────────────────────────────────────
    Task<ApiResponse<DailyPlanSummaryDto>> GetPlanSummaryAsync(int planId);
    Task<ApiResponse<DailyPlanSummaryDto>> PublishPlanAsync(int planId, int userId);

    // ── Plan History ────────────────────────────────────────────────────
    Task<ApiResponse<List<PlanHistoryItemDto>>> GetPlanHistoryAsync(int centerId);
}
