using System;
using System.Security.Claims;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
public class StaffAssignmentController : ControllerBase
{
    private readonly IStaffAssignmentService _assignmentService;

    public StaffAssignmentController(IStaffAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    private int? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirst("nameid")?.Value;

        if (int.TryParse(idStr, out var id))
        {
            return id;
        }
        return null;
    }

    private static DateOnly GetVietnamToday()
    {
        return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
    }

    /// <summary>
    /// Center: Tự động chia lịch chăm sóc cho nhân viên vào ngày chỉ định (mặc định ngày mai)
    /// Nghiệp vụ: 1 Staff quản lý tối đa 10 người bình thường và 4 người cần hỗ trợ (MobilityStatus)
    /// </summary>
    [HttpPost("api/center/staff-assignment/auto-assign")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AutoAssignSchedule([FromBody] AutoAssignScheduleRequestDto dto)
    {
        var currentUserId = GetCurrentUserId() ?? 0;
        var result = await _assignmentService.AutoAssignScheduleAsync(currentUserId, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Center: Xem lại chi tiết lịch chia của ngày (xem các groups phân công, số lượng cụ thường/hỗ trợ, cảnh báo)
    /// </summary>
    [HttpGet("api/center/staff-assignment")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSchedulePlan([FromQuery] DateOnly? date)
    {
        var targetDate = date ?? GetVietnamToday().AddDays(1);
        var result = await _assignmentService.GetSchedulePlanAsync(targetDate);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Center: Chỉnh sửa kế hoạch (chuyển người cao tuổi sang nhân viên khác quản lý)
    /// </summary>
    [HttpPut("api/center/staff-assignment/reassign")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ReassignElderly([FromBody] ReassignElderlyDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<DailySchedulePlanDto>.Fail("Dữ liệu không hợp lệ."));
        }

        var currentUserId = GetCurrentUserId() ?? 0;
        var result = await _assignmentService.ReassignElderlyAsync(currentUserId, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Center: Xác nhận lịch chăm sóc của ngày hôm sau (chuyển trạng thái sang Confirmed để nhân viên thấy group)
    /// </summary>
    [HttpPost("api/center/staff-assignment/confirm")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DailySchedulePlanDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmSchedule([FromBody] ConfirmScheduleDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<DailySchedulePlanDto>.Fail("Dữ liệu không hợp lệ."));
        }

        var currentUserId = GetCurrentUserId() ?? 0;
        var result = await _assignmentService.ConfirmScheduleAsync(currentUserId, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Staff: Xem group người cao tuổi được phân công cho mình quản lý trong ngày
    /// Mỗi staff chỉ quản lý group người già được chia
    /// </summary>
    [HttpGet("api/staff/my-group")]
    [Authorize(Roles = "Staff,Admin")]
    [ProducesResponseType(typeof(ApiResponse<StaffCareGroupDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<StaffCareGroupDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMyCareGroup([FromQuery] DateOnly? date)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(ApiResponse<StaffCareGroupDto>.Fail("Không xác định được danh tính nhân viên."));
        }

        var targetDate = date ?? GetVietnamToday();
        var result = await _assignmentService.GetMyCareGroupAsync(currentUserId.Value, targetDate);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}

