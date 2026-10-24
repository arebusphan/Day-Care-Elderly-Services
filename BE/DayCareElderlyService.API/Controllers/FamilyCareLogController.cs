using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Care log phía gia đình: chỉ xem, không có mục nội bộ
/// </summary>
[ApiController]
[Route("api/family")]
[Authorize(Roles = "FamilyMember")]
public class FamilyCareLogController : ControllerBase
{
    private readonly IFamilyCareLogService _familyCareLogService;
    private readonly ILogger<FamilyCareLogController> _logger;

    public FamilyCareLogController(IFamilyCareLogService familyCareLogService, ILogger<FamilyCareLogController> logger)
    {
        _familyCareLogService = familyCareLogService;
        _logger = logger;
    }

    /// <summary>
    /// Care log 1 ngày của cụ (mặc định hôm nay)
    /// </summary>
    [HttpGet("care-logs/{elderlyId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetDay(Guid elderlyId, [FromQuery] DateOnly? date) =>
        RunAsync(userId => _familyCareLogService.GetDayAsync(userId, elderlyId, date), "lấy care log");

    /// <summary>
    /// Lịch sử care log theo ngày (mặc định 30 ngày gần nhất, tối đa 92 ngày)
    /// </summary>
    [HttpGet("care-logs/{elderlyId:guid}/history")]
    [ProducesResponseType(typeof(ApiResponse<List<CareLogDaySummaryDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetHistory(Guid elderlyId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to) =>
        RunAsync(userId => _familyCareLogService.GetHistoryAsync(userId, elderlyId, from, to), "lấy lịch sử care log");

    /// <summary>
    /// Các lần đo chỉ số và lịch sử uống thuốc trong N ngày gần nhất (mặc định 30)
    /// </summary>
    [HttpGet("care-logs/{elderlyId:guid}/health")]
    [ProducesResponseType(typeof(ApiResponse<HealthHistoryDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetHealth(Guid elderlyId, [FromQuery] int days = 30) =>
        RunAsync(userId => _familyCareLogService.GetHealthAsync(userId, elderlyId, days), "lấy lịch sử sức khỏe");

    /// <summary>
    /// Sự cố và cảnh báo của các cụ nhà mình trong N ngày gần nhất (mặc định 30)
    /// </summary>
    [HttpGet("incidents")]
    [ProducesResponseType(typeof(ApiResponse<List<IncidentDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetIncidents([FromQuery] int days = 30) =>
        RunAsync(userId => _familyCareLogService.GetIncidentsAsync(userId, days), "lấy danh sách sự cố");

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

    private async Task<IActionResult> RunAsync<T>(Func<Guid, Task<ApiResponse<T>>> action, string actionName)
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
            return StatusCode(500, ApiResponse<T>.Fail($"Lỗi máy chủ khi {actionName}."));
        }
    }
}
