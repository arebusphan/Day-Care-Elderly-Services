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
    /// Kiểm tra lịch tương lai trước khi ngừng hoạt động nhân viên
    /// </summary>
    Task<ApiResponse<DeactivationWarningDto>> CheckDeactivationWarningAsync(int staffUserId);

    /// <summary>
    /// Bật/tắt trạng thái hoạt động của nhân viên (Không cho tự ngừng hoạt động chính mình)
    /// </summary>
    Task<ApiResponse<bool>> ToggleStaffStatusAsync(int staffUserId, int currentManagerUserId);

    /// <summary>
    /// Lấy danh sách lịch làm việc của nhân viên
    /// </summary>
    Task<ApiResponse<List<StaffScheduleDto>>> GetStaffSchedulesAsync(int staffUserId);

    /// <summary>
    /// Thêm/cập nhật lịch làm việc cho nhân viên (ngày đó có đi hay không)
    /// </summary>
    Task<ApiResponse<StaffScheduleDto>> SetStaffScheduleAsync(int staffUserId, CreateStaffScheduleDto dto);

    /// <summary>
    /// Xóa một ngày trong lịch làm việc
    /// </summary>
    Task<ApiResponse<bool>> DeleteStaffScheduleAsync(int staffUserId, int scheduleId);
}
