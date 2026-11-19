using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// Dịch vụ phân tích, thống kê tiêu hao và cảnh báo hạn dùng vật tư y tế (WF-05 / D2 / SR-04).
/// </summary>
public class MedicalSupplyAnalyticsService : IMedicalSupplyAnalyticsService
{
    private readonly AppDbContext _context;
    private readonly ILogger<MedicalSupplyAnalyticsService> _logger;

    public MedicalSupplyAnalyticsService(AppDbContext context, ILogger<MedicalSupplyAnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<SupplyConsumptionSummaryDto>> GetInventorySummaryAsync()
    {
        try
        {
            var supplies = await _context.MedicalSupplies.AsNoTracking().ToListAsync();
            var today = DateOnly.FromDateTime(VietnamTime.Now);
            var warningThreshold = today.AddDays(30);

            var totalCost = await _context.IncidentReports
                .AsNoTracking()
                .SumAsync(i => (decimal?)i.SupplyChargeAmount) ?? 0m;

            var summary = new SupplyConsumptionSummaryDto
            {
                TotalSupplies = supplies.Count,
                ActiveSupplies = supplies.Count(s => s.IsActive),
                LowStockCount = supplies.Count(s => s.IsActive && s.QuantityInStock <= s.MinimumStock),
                ExpiredCount = supplies.Count(s => s.IsActive && s.ExpiryDate.HasValue && s.ExpiryDate.Value < today),
                ExpiringSoonCount = supplies.Count(s => s.IsActive && s.ExpiryDate.HasValue && s.ExpiryDate.Value >= today && s.ExpiryDate.Value <= warningThreshold),
                TotalInventoryValue = supplies.Where(s => s.IsActive).Sum(s => s.QuantityInStock * s.UnitPrice),
                TotalIncidentSupplyCost = totalCost
            };

            return ApiResponse<SupplyConsumptionSummaryDto>.Ok(summary, "Lấy tổng quan tồn kho vật tư thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo báo cáo tổng quan tồn kho vật tư y tế");
            return ApiResponse<SupplyConsumptionSummaryDto>.Fail("Đã xảy ra lỗi khi tạo báo cáo tổng quan vật tư.");
        }
    }

    public async Task<ApiResponse<List<TopUsedSupplyDto>>> GetTopConsumedSuppliesAsync(int limit = 10, int? months = 1)
    {
        try
        {
            var query = _context.SupplyTransactions
                .AsNoTracking()
                .Where(t => t.TransactionType == SupplyStock.TypeIncident || t.TransactionType == SupplyStock.TypeOut);

            if (months.HasValue && months.Value > 0)
            {
                var fromDate = VietnamTime.Now.AddMonths(-months.Value);
                query = query.Where(t => t.OccurredAt >= fromDate);
            }

            var grouped = await query
                .GroupBy(t => t.SupplyId)
                .Select(g => new
                {
                    SupplyId = g.Key,
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalCost = g.Sum(x => x.Quantity * (x.UnitPrice ?? 0m)),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.TotalCost)
                .Take(limit)
                .ToListAsync();

            var supplyIds = grouped.Select(x => x.SupplyId).ToList();
            var supplies = await _context.MedicalSupplies
                .AsNoTracking()
                .Where(s => supplyIds.Contains(s.SupplyId))
                .ToDictionaryAsync(s => s.SupplyId);

            var result = grouped.Select(g =>
            {
                supplies.TryGetValue(g.SupplyId, out var s);
                return new TopUsedSupplyDto
                {
                    SupplyId = g.SupplyId,
                    SupplyName = s?.SupplyName ?? $"Vật tư #{g.SupplyId}",
                    Unit = s?.Unit ?? "đơn vị",
                    TotalQuantityUsed = g.TotalQuantity,
                    TotalCost = g.TotalCost,
                    UsageCount = g.Count,
                    CurrentStock = s?.QuantityInStock ?? 0m
                };
            }).ToList();

            return ApiResponse<List<TopUsedSupplyDto>>.Ok(result, "Lấy danh sách top vật tư tiêu hao thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi thống kê top vật tư y tế tiêu hao");
            return ApiResponse<List<TopUsedSupplyDto>>.Fail("Đã xảy ra lỗi khi thống kê top vật tư tiêu hao.");
        }
    }

    public async Task<ApiResponse<List<ExpiringSupplyAlertDto>>> GetExpiringSuppliesAsync(int thresholdDays = 30)
    {
        try
        {
            var supplies = await _context.MedicalSupplies
                .AsNoTracking()
                .Where(s => s.IsActive && s.ExpiryDate.HasValue)
                .ToListAsync();

            var today = DateOnly.FromDateTime(VietnamTime.Now);
            var alerts = new List<ExpiringSupplyAlertDto>();

            foreach (var s in supplies)
            {
                var expiry = s.ExpiryDate!.Value;
                var daysUntilExpiry = expiry.DayNumber - today.DayNumber;

                if (daysUntilExpiry <= thresholdDays)
                {
                    string status = daysUntilExpiry switch
                    {
                        < 0 => "Expired",
                        <= 7 => "Critical",
                        _ => "Warning"
                    };

                    alerts.Add(new ExpiringSupplyAlertDto
                    {
                        SupplyId = s.SupplyId,
                        SupplyName = s.SupplyName,
                        Unit = s.Unit,
                        QuantityInStock = s.QuantityInStock,
                        UnitPrice = s.UnitPrice,
                        ExpiryDate = s.ExpiryDate,
                        DaysUntilExpiry = daysUntilExpiry,
                        Status = status
                    });
                }
            }

            alerts = alerts.OrderBy(a => a.DaysUntilExpiry).ToList();
            return ApiResponse<List<ExpiringSupplyAlertDto>>.Ok(alerts, $"Tìm thấy {alerts.Count} vật tư cần lưu ý hạn dùng.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi quét danh sách vật tư sắp hết hạn");
            return ApiResponse<List<ExpiringSupplyAlertDto>>.Fail("Đã xảy ra lỗi khi quét hạn dùng vật tư.");
        }
    }

    public async Task<ApiResponse<List<ElderlySupplyChargeReportDto>>> GetElderlySupplyCostReportAsync(int? months = 1)
    {
        try
        {
            var query = _context.IncidentReports
                .AsNoTracking()
                .Include(i => i.Elderly)
                .Where(i => i.SupplyChargeAmount > 0);

            if (months.HasValue && months.Value > 0)
            {
                var fromDate = VietnamTime.Now.AddMonths(-months.Value);
                query = query.Where(i => i.OccurredAt >= fromDate);
            }

            var report = await query
                .GroupBy(i => new { i.ElderlyId, i.Elderly.FullName })
                .Select(g => new ElderlySupplyChargeReportDto
                {
                    ElderlyId = g.Key.ElderlyId,
                    FullName = g.Key.FullName,
                    IncidentCount = g.Count(),
                    TotalSupplyCost = g.Sum(x => x.SupplyChargeAmount),
                    LastIncidentAt = g.Max(x => x.OccurredAt)
                })
                .OrderByDescending(r => r.TotalSupplyCost)
                .ToListAsync();

            return ApiResponse<List<ElderlySupplyChargeReportDto>>.Ok(report, "Tạo báo cáo chi phí vật tư theo người cao tuổi thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lập báo cáo chi phí vật tư theo người cao tuổi");
            return ApiResponse<List<ElderlySupplyChargeReportDto>>.Fail("Đã xảy ra lỗi khi lập báo cáo chi phí vật tư.");
        }
    }
}
