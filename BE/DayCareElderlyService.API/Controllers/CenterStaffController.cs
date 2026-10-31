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

    private Guid? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirst("nameid")?.Value;

        if (Guid.TryParse(idStr, out var id))
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
    [HttpGet("{id:guid}/deactivation-check")]
    [ProducesResponseType(typeof(ApiResponse<DeactivationWarningDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckDeactivationWarning(Guid id)
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
    [HttpPatch("{id:guid}/toggle-status")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleStaffStatus(Guid id)
    {
        var currentUserId = GetCurrentUserId() ?? Guid.Empty;
        var result = await _staffService.ToggleStaffStatusAsync(id, currentUserId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách ngày nghỉ của nhân viên
    /// </summary>
    [HttpGet("{id:guid}/leaves")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffLeaveDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffLeaves(Guid id)
    {
        var result = await _staffService.GetStaffLeavesAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Thêm ngày nghỉ cho nhân viên
    /// </summary>
    [HttpPost("{id:guid}/leaves")]
    [ProducesResponseType(typeof(ApiResponse<StaffLeaveDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<StaffLeaveDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddStaffLeave(Guid id, [FromBody] CreateStaffLeaveDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<StaffLeaveDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _staffService.AddStaffLeaveAsync(id, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa ngày nghỉ của nhân viên
    /// </summary>
    [HttpDelete("{id:guid}/leaves/{leaveId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteStaffLeave(Guid id, Guid leaveId)
    {
        var result = await _staffService.DeleteStaffLeaveAsync(id, leaveId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
