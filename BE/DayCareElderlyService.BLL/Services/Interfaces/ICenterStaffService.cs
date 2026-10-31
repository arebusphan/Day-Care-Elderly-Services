using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CenterStaff;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface ICenterStaffService
{
    /// <summary>
    /// Lấy danh sách nhân viên có vai trò Staff (phân trang, tìm kiếm, lọc trạng thái)
    /// </summary>
    Task<ApiResponse<PagedResult<CenterStaffDto>>> GetStaffListAsync(CenterStaffFilterDto filter);

    /// <summary>
    /// Thêm nhân viên mới (tạo tài khoản User có vai trò Staff)
    /// </summary>
    Task<ApiResponse<CenterStaffDto>> CreateStaffAsync(CreateCenterStaffDto dto);

    /// <summary>
    /// Kiểm tra lịch tương lai (ngày nghỉ / ca làm việc) trước khi ngừng hoạt động nhân viên
    /// </summary>
    Task<ApiResponse<DeactivationWarningDto>> CheckDeactivationWarningAsync(Guid staffUserId);

    /// <summary>
    /// Bật/tắt trạng thái hoạt động của nhân viên (Không cho tự ngừng hoạt động chính mình)
    /// </summary>
    Task<ApiResponse<bool>> ToggleStaffStatusAsync(Guid staffUserId, Guid currentManagerUserId);

    /// <summary>
    /// Lấy danh sách ngày nghỉ của nhân viên
    /// </summary>
    Task<ApiResponse<List<StaffLeaveDto>>> GetStaffLeavesAsync(Guid staffUserId);

    /// <summary>
    /// Thêm ngày nghỉ cho nhân viên (không cho đặt CN hoặc ngày đã qua)
    /// </summary>
    Task<ApiResponse<StaffLeaveDto>> AddStaffLeaveAsync(Guid staffUserId, CreateStaffLeaveDto dto);

    /// <summary>
    /// Xóa một ngày nghỉ
    /// </summary>
    Task<ApiResponse<bool>> DeleteStaffLeaveAsync(Guid staffUserId, Guid leaveId);
}
