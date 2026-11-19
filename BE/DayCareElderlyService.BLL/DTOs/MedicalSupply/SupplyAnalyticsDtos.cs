using System;
using System.Collections.Generic;

namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

/// <summary>
/// Tổng quan tồn kho và chi phí tiêu hao vật tư y tế (WF-05 / D2 / F-14).
/// </summary>
public class SupplyConsumptionSummaryDto
{
    public int TotalSupplies { get; set; }
    public int ActiveSupplies { get; set; }
    public int LowStockCount { get; set; }
    public int ExpiringSoonCount { get; set; }
    public int ExpiredCount { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public decimal TotalIncidentSupplyCost { get; set; }
}

/// <summary>
/// Thống kê top vật tư y tế tiêu hao nhiều nhất theo số lượng và chi phí.
/// </summary>
public class TopUsedSupplyDto
{
    public int SupplyId { get; set; }
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal TotalQuantityUsed { get; set; }
    public decimal TotalCost { get; set; }
    public int UsageCount { get; set; }
    public decimal CurrentStock { get; set; }
}

/// <summary>
/// Cảnh báo vật tư y tế sắp hết hạn sử dụng (SR-04).
/// </summary>
public class ExpiringSupplyAlertDto
{
    public int SupplyId { get; set; }
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal QuantityInStock { get; set; }
    public decimal UnitPrice { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public int DaysUntilExpiry { get; set; }
    public string Status { get; set; } = "Good"; // Expired, Critical, Warning, Good
}

/// <summary>
/// Tổng hợp chi phí vật tư sơ cấp cứu phát sinh theo từng người cao tuổi.
/// </summary>
public class ElderlySupplyChargeReportDto
{
    public int ElderlyId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public int IncidentCount { get; set; }
    public decimal TotalSupplyCost { get; set; }
    public DateTime? LastIncidentAt { get; set; }
}
