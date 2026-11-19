using System.Collections.Generic;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Giao diện dịch vụ phân tích, thống kê tiêu hao và cảnh báo hạn dùng vật tư y tế (WF-05 / D2 / SR-04).
/// </summary>
public interface IMedicalSupplyAnalyticsService
{
    /// <summary>Lấy tổng quan giá trị tồn kho, số lượng vật tư sắp hết và cảnh báo hạn dùng</summary>
    Task<ApiResponse<SupplyConsumptionSummaryDto>> GetInventorySummaryAsync();

    /// <summary>Thống kê top vật tư y tế tiêu hao nhiều nhất theo khoảng thời gian</summary>
    Task<ApiResponse<List<TopUsedSupplyDto>>> GetTopConsumedSuppliesAsync(int limit = 10, int? months = 1);

    /// <summary>Quét và cảnh báo danh sách vật tư y tế sắp hết hạn hoặc đã hết hạn</summary>
    Task<ApiResponse<List<ExpiringSupplyAlertDto>>> GetExpiringSuppliesAsync(int thresholdDays = 30);

    /// <summary>Thống kê tổng chi phí vật tư sự cố phát sinh theo từng người cao tuổi</summary>
    Task<ApiResponse<List<ElderlySupplyChargeReportDto>>> GetElderlySupplyCostReportAsync(int? months = 1);
}
