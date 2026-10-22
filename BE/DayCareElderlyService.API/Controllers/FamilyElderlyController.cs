using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Elderly;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/family/elderly")]
[Authorize]
public class FamilyElderlyController : ControllerBase
{
    private readonly IElderlyService _elderlyService;
    private readonly ILogger<FamilyElderlyController> _logger;

    public FamilyElderlyController(IElderlyService elderlyService, ILogger<FamilyElderlyController> logger)
    {
        _elderlyService = elderlyService;
        _logger = logger;
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
    /// Tạo mới hồ sơ người cao tuổi bởi thành viên gia đình
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateElderlyProfile([FromBody] CreateElderlyProfileDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<ElderlyProfileDto>.Fail("Dữ liệu nhập vào không hợp lệ.", errors));
            }

            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<ElderlyProfileDto>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
            }

            var result = await _elderlyService.CreateElderlyProfileAsync(userId.Value, dto);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo hồ sơ người cao tuổi: {Message}", ex.Message);
            var innerMsg = ex.InnerException != null ? " | Chi tiết: " + ex.InnerException.Message : "";
            return StatusCode(500, ApiResponse<ElderlyProfileDto>.Fail($"Lỗi máy chủ khi tạo hồ sơ: {ex.Message}{innerMsg}"));
        }
    }

    /// <summary>
    /// Lấy danh sách hồ sơ người cao tuổi của tài khoản gia đình hiện tại
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ElderlyProfileDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyElderlyProfiles()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<List<ElderlyProfileDto>>.Fail("Không xác thực được người dùng."));
            }

            var result = await _elderlyService.GetMyElderlyProfilesAsync(userId.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách hồ sơ: {Message}", ex.Message);
            var innerMsg = ex.InnerException != null ? " | Chi tiết: " + ex.InnerException.Message : "";
            return StatusCode(500, ApiResponse<List<ElderlyProfileDto>>.Fail($"Lỗi máy chủ: {ex.Message}{innerMsg}"));
        }
    }

    /// <summary>
    /// Lấy chi tiết hồ sơ người cao tuổi theo ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetElderlyProfileById(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<ElderlyProfileDto>.Fail("Không xác thực được người dùng."));
            }

            var result = await _elderlyService.GetElderlyProfileByIdAsync(userId.Value, id);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết hồ sơ {Id}: {Message}", id, ex.Message);
            var innerMsg = ex.InnerException != null ? " | Chi tiết: " + ex.InnerException.Message : "";
            return StatusCode(500, ApiResponse<ElderlyProfileDto>.Fail($"Lỗi máy chủ: {ex.Message}{innerMsg}"));
        }
    }

    /// <summary>
    /// Chỉnh sửa hồ sơ người cao tuổi
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<ElderlyProfileDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateElderlyProfile(Guid id, [FromBody] UpdateElderlyProfileDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<ElderlyProfileDto>.Fail("Dữ liệu nhập vào không hợp lệ.", errors));
            }

            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<ElderlyProfileDto>.Fail("Không xác thực được người dùng."));
            }

            var result = await _elderlyService.UpdateElderlyProfileAsync(userId.Value, id, dto);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật hồ sơ {Id}: {Message}", id, ex.Message);
            var innerMsg = ex.InnerException != null ? " | Chi tiết: " + ex.InnerException.Message : "";
            return StatusCode(500, ApiResponse<ElderlyProfileDto>.Fail($"Lỗi máy chủ khi cập nhật: {ex.Message}{innerMsg}"));
        }
    }

    /// <summary>
    /// Xóa hồ sơ người cao tuổi
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteElderlyProfile(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<bool>.Fail("Không xác thực được người dùng."));
            }

            var result = await _elderlyService.DeleteElderlyProfileAsync(userId.Value, id);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa hồ sơ {Id}: {Message}", id, ex.Message);
            var innerMsg = ex.InnerException != null ? " | Chi tiết: " + ex.InnerException.Message : "";
            return StatusCode(500, ApiResponse<bool>.Fail($"Lỗi máy chủ khi xóa hồ sơ: {ex.Message}{innerMsg}"));
        }
    }
}
