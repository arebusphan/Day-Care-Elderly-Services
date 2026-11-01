using System;
using System.Security.Claims;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CenterStaff;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/center/staff")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class CenterStaffController : ControllerBase
{
    private readonly ICenterStaffService _staffService;

    public CenterStaffController(ICenterStaffService staffService)
    {
        _staffService = staffService;
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

    /// <summary>
    /// Lấy danh sách nhân viên có vai trò Staff (phân trang, tìm kiếm, lọc trạng thái)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<CenterStaffDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffList([FromQuery] CenterStaffFilterDto filter)
    {
        var result = await _staffService.GetStaffListAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Thêm nhân viên mới (tạo User vai trò Staff, mặc định Hoạt động)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CenterStaffDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CenterStaffDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateStaff([FromBody] CreateCenterStaffDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<CenterStaffDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _staffService.CreateStaffAsync(dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Kiểm tra cảnh báo lịch tương lai trước khi ngừng hoạt động nhân viên
    /// </summary>
    [HttpGet("{id:int}/deactivation-check")]
    [ProducesResponseType(typeof(ApiResponse<DeactivationWarningDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckDeactivationWarning(int id)
    {
        var result = await _staffService.CheckDeactivationWarningAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đổi trạng thái Đang hoạt động / Ngừng hoạt động (IsActive)
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleStaffStatus(int id)
    {
        var currentUserId = GetCurrentUserId() ?? 0;
        var result = await _staffService.ToggleStaffStatusAsync(id, currentUserId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lịch làm việc của nhân viên
    /// </summary>
    [HttpGet("{id:int}/schedules")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffScheduleDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffSchedules(int id)
    {
        var result = await _staffService.GetStaffSchedulesAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Thêm/cập nhật lịch làm việc cho nhân viên (ngày đó có đi hay không)
    /// </summary>
    [HttpPost("{id:int}/schedules")]
    [ProducesResponseType(typeof(ApiResponse<StaffScheduleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<StaffScheduleDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetStaffSchedule(int id, [FromBody] CreateStaffScheduleDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<StaffScheduleDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _staffService.SetStaffScheduleAsync(id, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa lịch làm việc của nhân viên
    /// </summary>
    [HttpDelete("{id:int}/schedules/{scheduleId:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteStaffSchedule(int id, int scheduleId)
    {
        var result = await _staffService.DeleteStaffScheduleAsync(id, scheduleId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
