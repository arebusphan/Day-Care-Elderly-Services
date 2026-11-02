using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Attendance;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/attendance")]
[Authorize(Roles = "Staff")]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _attendanceService;
    private readonly ILogger<AttendanceController> _logger;

    public AttendanceController(IAttendanceService attendanceService, ILogger<AttendanceController> logger)
    {
        _attendanceService = attendanceService;
        _logger = logger;
    }

    /// <summary>
    /// Danh sách điểm danh theo ngày. Không truyền date thì lấy VietnamTime.Today.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetList([FromQuery] DateOnly? date)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<AttendanceListItemDto>>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.GetListAsync(userId.Value, date);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách điểm danh ngày {Date}", date);
            return StatusCode(500, ApiResponse<List<AttendanceListItemDto>>.Fail("Lỗi máy chủ khi lấy danh sách điểm danh."));
        }
    }

    /// <summary>
    /// Lịch sử điểm danh của một người cao tuổi.
    /// </summary>
    [HttpGet("elderly/{elderlyId:int}/history")]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHistoryByElderly(int elderlyId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<AttendanceListItemDto>>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.GetHistoryByElderlyAsync(userId.Value, elderlyId);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy lịch sử điểm danh người cao tuổi {ElderlyId}", elderlyId);
            return StatusCode(500, ApiResponse<List<AttendanceListItemDto>>.Fail("Lỗi máy chủ khi lấy lịch sử điểm danh."));
        }
    }

    /// <summary>
    /// Danh sách người cao tuổi đang có mặt hôm nay (đã check-in, chưa check-out).
    /// Route tĩnh đặt trước {attendanceId:int} để tránh xung đột.
    /// </summary>
    [HttpGet("present-today")]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<List<AttendanceListItemDto>>), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetPresentToday()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<List<AttendanceListItemDto>>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.GetPresentTodayAsync(userId.Value);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách người cao tuổi đang có mặt hôm nay");
            return StatusCode(500, ApiResponse<List<AttendanceListItemDto>>.Fail("Lỗi máy chủ khi lấy danh sách đang có mặt."));
        }
    }

    /// <summary>
    /// Chi tiết một bản ghi điểm danh theo attendanceId.
    /// </summary>
    [HttpGet("{attendanceId:int}")]
    [ProducesResponseType(typeof(ApiResponse<AttendanceDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<AttendanceDetailDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<AttendanceDetailDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<AttendanceDetailDto>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<AttendanceDetailDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int attendanceId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<AttendanceDetailDto>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.GetByIdAsync(userId.Value, attendanceId);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết điểm danh {AttendanceId}", attendanceId);
            return StatusCode(500, ApiResponse<AttendanceDetailDto>.Fail("Lỗi máy chủ khi lấy chi tiết điểm danh."));
        }
    }

    /// <summary>
    /// Check-in người cao tuổi trong ngày (theo giờ Việt Nam). UserId lấy từ JWT.
    /// </summary>
    [HttpPost("check-in")]
    [ProducesResponseType(typeof(ApiResponse<CheckInResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CheckInResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<CheckInResponseDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<CheckInResponseDto>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<CheckInResponseDto>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<CheckInResponseDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<CheckInResponseDto>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.CheckInAsync(userId.Value, request);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi check-in người cao tuổi {ElderlyId}", request.ElderlyId);
            return StatusCode(500, ApiResponse<CheckInResponseDto>.Fail("Lỗi máy chủ khi check-in."));
        }
    }

    /// <summary>
    /// Check-out người cao tuổi trong ngày (theo giờ Việt Nam). UserId lấy từ JWT.
    /// </summary>
    [HttpPost("check-out")]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<CheckOutResponseDto>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<CheckOutResponseDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<CheckOutResponseDto>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.CheckOutAsync(userId.Value, request);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi check-out người cao tuổi {ElderlyId}", request.ElderlyId);
            return StatusCode(500, ApiResponse<CheckOutResponseDto>.Fail("Lỗi máy chủ khi check-out."));
        }
    }

    /// <summary>
    /// Chỉnh sửa thời gian điểm danh khi có sai sót. UpdatedBy lấy từ JWT.
    /// </summary>
    [HttpPut("{attendanceId:int}")]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<UpdateAttendanceResponseDto>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int attendanceId, [FromBody] UpdateAttendanceRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<UpdateAttendanceResponseDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(ApiResponse<UpdateAttendanceResponseDto>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await _attendanceService.UpdateAsync(userId.Value, attendanceId, request);
            return StatusCode(result.StatusCode, result.Body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi chỉnh sửa điểm danh {AttendanceId}", attendanceId);
            return StatusCode(500, ApiResponse<UpdateAttendanceResponseDto>.Fail("Lỗi máy chủ khi chỉnh sửa điểm danh."));
        }
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
}
