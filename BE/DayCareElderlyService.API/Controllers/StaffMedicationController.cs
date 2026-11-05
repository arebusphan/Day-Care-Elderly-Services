using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Medication;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Kế hoạch thuốc phía nhân viên: tạo / cập nhật thuốc và sinh lịch liều
/// </summary>
[ApiController]
[Route("api/staff")]
[Authorize(Roles = "Staff,Admin")]
public class StaffMedicationController : ControllerBase
{
    private readonly IMedicationService _medicationService;
    private readonly ILogger<StaffMedicationController> _logger;
    private readonly IHostEnvironment _environment;

    public StaffMedicationController(
        IMedicationService medicationService,
        ILogger<StaffMedicationController> logger,
        IHostEnvironment environment)
    {
        _medicationService = medicationService;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>
    /// Tạo kế hoạch thuốc cho cụ (kèm giờ uống), tự sinh liều theo GenerateDays (mặc định 14 ngày)
    /// </summary>
    [HttpPost("elderly/{elderlyId:int}/medication-plans")]
    [ProducesResponseType(typeof(ApiResponse<MedicationPlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicationPlanDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> CreatePlan(int elderlyId, [FromBody] CreateMedicationPlanDto dto) =>
        RunAsync(userId => _medicationService.CreatePlanAsync(userId, elderlyId, dto), "tạo kế hoạch thuốc");

    /// <summary>
    /// Danh sách kế hoạch thuốc của cụ. activeOnly=true chỉ lấy kế hoạch đang dùng.
    /// </summary>
    [HttpGet("elderly/{elderlyId:int}/medication-plans")]
    [ProducesResponseType(typeof(ApiResponse<List<MedicationPlanDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetPlans(int elderlyId, [FromQuery] bool? activeOnly) =>
        RunAsync(userId => _medicationService.GetPlansAsync(userId, elderlyId, activeOnly), "lấy kế hoạch thuốc");

    /// <summary>
    /// Cập nhật thuốc, liều, hướng dẫn, ngày hiệu lực và giờ uống
    /// </summary>
    [HttpPut("medication-plans/{planId:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicationPlanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicationPlanDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> UpdatePlan(int planId, [FromBody] UpdateMedicationPlanDto dto) =>
        RunAsync(userId => _medicationService.UpdatePlanAsync(userId, planId, dto), "cập nhật kế hoạch thuốc");

    /// <summary>
    /// Tạo các liều dự kiến (MedicationRecords) từ giờ uống và khoảng ngày
    /// </summary>
    [HttpPost("medication-plans/{planId:int}/doses/generate")]
    [ProducesResponseType(typeof(ApiResponse<GenerateDosesResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<GenerateDosesResultDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> GenerateDoses(int planId, [FromBody] GenerateDosesDto? dto) =>
        RunAsync(userId => _medicationService.GenerateDosesAsync(userId, planId, dto ?? new GenerateDosesDto()),
            "tạo lịch liều thuốc");

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

    private async Task<IActionResult> RunAsync<T>(Func<int, Task<ApiResponse<T>>> action, string actionName)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<T>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
            }

            var result = await action(userId.Value);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi {Action}: {Message}", actionName, ex.Message);
            var message = _environment.IsDevelopment()
                ? $"Lỗi máy chủ khi {actionName}: {ex.GetBaseException().Message}"
                : $"Lỗi máy chủ khi {actionName}.";
            return StatusCode(500, ApiResponse<T>.Fail(message));
        }
    }
}
