using System.Collections.Generic;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// API Báo cáo, Thống kê tiêu hao và Cảnh báo hạn dùng vật tư y tế (WF-05 / D2 / SR-04).
/// </summary>
[ApiController]
[Route("api/medical-supplies/analytics")]
[Authorize(Roles = "Staff,Center,CenterManager,Admin")]
public class MedicalSupplyAnalyticsController : ControllerBase
{
    private readonly IMedicalSupplyAnalyticsService _analyticsService;

    public MedicalSupplyAnalyticsController(IMedicalSupplyAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    /// <summary>
    /// Lấy báo cáo tổng quan tồn kho, tổng giá trị tài sản vật tư và cảnh báo hạn dùng
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<SupplyConsumptionSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _analyticsService.GetInventorySummaryAsync();
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Thống kê top vật tư y tế tiêu hao nhiều nhất theo số lượng và chi phí
    /// </summary>
    /// <param name="limit">Số lượng vật tư hiển thị tối đa (mặc định 10)</param>
    /// <param name="months">Khoảng thời gian thống kê tính theo tháng gần nhất (mặc định 1 tháng)</param>
    [HttpGet("top-consumed")]
    [ProducesResponseType(typeof(ApiResponse<List<TopUsedSupplyDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTopConsumed([FromQuery] int limit = 10, [FromQuery] int? months = 1)
    {
        var result = await _analyticsService.GetTopConsumedSuppliesAsync(limit, months);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Quét và cảnh báo danh sách vật tư y tế sắp hết hạn hoặc đã quá hạn sử dụng
    /// </summary>
    /// <param name="thresholdDays">Số ngày ngưỡng cảnh báo trước khi hết hạn (mặc định 30 ngày)</param>
    [HttpGet("expiring")]
    [ProducesResponseType(typeof(ApiResponse<List<ExpiringSupplyAlertDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExpiringSupplies([FromQuery] int thresholdDays = 30)
    {
        var result = await _analyticsService.GetExpiringSuppliesAsync(thresholdDays);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Báo cáo tổng hợp chi phí vật tư sơ cấp cứu phát sinh theo từng người cao tuổi
    /// </summary>
    /// <param name="months">Số tháng gần nhất (mặc định 1 tháng, null = tất cả)</param>
    [HttpGet("elderly-charges")]
    [ProducesResponseType(typeof(ApiResponse<List<ElderlySupplyChargeReportDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetElderlySupplyCharges([FromQuery] int? months = 1)
    {
        var result = await _analyticsService.GetElderlySupplyCostReportAsync(months);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
