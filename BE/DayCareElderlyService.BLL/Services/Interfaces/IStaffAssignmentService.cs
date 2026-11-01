using System;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IStaffAssignmentService
{
    /// <summary>
    /// Tự động chia lịch chăm sóc cho nhân viên theo ngày (định mức: 1 staff quản lý tối đa 10 người bình thường và 4 người cần hỗ trợ)
    /// </summary>
    Task<ApiResponse<DailySchedulePlanDto>> AutoAssignScheduleAsync(int centerManagerUserId, AutoAssignScheduleRequestDto dto);

    /// <summary>
    /// Center xem chi tiết lịch chia của một ngày (để xem lại và chuẩn bị xác nhận)
    /// </summary>
    Task<ApiResponse<DailySchedulePlanDto>> GetSchedulePlanAsync(DateOnly date);

    /// <summary>
    /// Center chỉnh sửa: chuyển người cao tuổi sang nhân viên khác quản lý
    /// </summary>
    Task<ApiResponse<DailySchedulePlanDto>> ReassignElderlyAsync(int centerManagerUserId, ReassignElderlyDto dto);

    /// <summary>
    /// Center xác nhận lịch chăm sóc của ngày hôm sau (chuyển trạng thái sang Confirmed)
    /// </summary>
    Task<ApiResponse<DailySchedulePlanDto>> ConfirmScheduleAsync(int centerManagerUserId, ConfirmScheduleDto dto);

    /// <summary>
    /// Staff xem group người cao tuổi được phân công cho mình quản lý trong ngày
    /// </summary>
    Task<ApiResponse<StaffCareGroupDto>> GetMyCareGroupAsync(int staffUserId, DateOnly date);
}

