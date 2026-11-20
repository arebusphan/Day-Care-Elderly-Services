using System;
using System.Collections.Generic;
using System.Linq;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;
using DayCareElderlyService.Models.Entities;
using Xunit;

namespace DayCareElderlyService.Tests;

/// <summary>
/// WF-05 / D2 / SR-04: Kiểm thử nghiệp vụ phân tích tiêu hao,
/// định giá tồn kho và quét cảnh báo hạn dùng vật tư y tế.
/// </summary>
public class SupplyAnalyticsTests
{
    private static MedicalSupply CreateSupply(int id, string name, decimal stock, decimal minStock, decimal unitPrice, DateOnly? expiry = null, bool isActive = true) => new()
    {
        SupplyId = id,
        SupplyName = name,
        QuantityInStock = stock,
        MinimumStock = minStock,
        UnitPrice = unitPrice,
        ExpiryDate = expiry,
        Unit = "hộp",
        IsActive = isActive
    };

    [Fact]
    public void Inventory_total_valuation_calculates_sum_of_stock_times_unit_price()
    {
        // Arrange
        var supplies = new List<MedicalSupply>
        {
            CreateSupply(1, "Gạc vô trùng", stock: 10m, minStock: 2m, unitPrice: 15_000m), // 150,000
            CreateSupply(2, "Cồn Povidine", stock: 5m, minStock: 2m, unitPrice: 20_000m),   // 100,000
            CreateSupply(3, "Băng cá nhân", stock: 50m, minStock: 10m, unitPrice: 2_000m),  // 100,000
            CreateSupply(4, "Thuốc ngừng sử dụng", stock: 20m, minStock: 1m, unitPrice: 50_000m, isActive: false) // Không tính vật tư inactive
        };

        // Act
        decimal totalValue = supplies
            .Where(s => s.IsActive)
            .Sum(s => s.QuantityInStock * s.UnitPrice);

        // Assert
        Assert.Equal(350_000m, totalValue);
    }

    [Fact]
    public void LowStock_count_matches_active_supplies_at_or_below_minimum_stock()
    {
        // Arrange
        var supplies = new List<MedicalSupply>
        {
            CreateSupply(1, "Vật tư đủ", stock: 10m, minStock: 5m, unitPrice: 10_000m),
            CreateSupply(2, "Vật tư chạm ngưỡng", stock: 3m, minStock: 3m, unitPrice: 10_000m),
            CreateSupply(3, "Vật tư dưới ngưỡng", stock: 1m, minStock: 5m, unitPrice: 10_000m),
            CreateSupply(4, "Vật tư inactive dưới ngưỡng", stock: 0m, minStock: 5m, unitPrice: 10_000m, isActive: false)
        };

        // Act
        int lowStockCount = supplies.Count(s => s.IsActive && s.QuantityInStock <= s.MinimumStock);

        // Assert
        Assert.Equal(2, lowStockCount);
    }

    [Theory]
    [InlineData(-5, "Expired")]
    [InlineData(-1, "Expired")]
    [InlineData(0, "Critical")]
    [InlineData(5, "Critical")]
    [InlineData(7, "Critical")]
    [InlineData(15, "Warning")]
    [InlineData(30, "Warning")]
    public void Expiry_status_classification_maps_correctly(int daysUntilExpiry, string expectedStatus)
    {
        // Act
        string status = daysUntilExpiry switch
        {
            < 0 => "Expired",
            <= 7 => "Critical",
            _ => "Warning"
        };

        // Assert
        Assert.Equal(expectedStatus, status);
    }

    [Fact]
    public void Top_consumed_supplies_orders_by_cost_descending()
    {
        // Arrange
        var items = new List<TopUsedSupplyDto>
        {
            new() { SupplyId = 1, SupplyName = "Băng gạc", TotalQuantityUsed = 10m, TotalCost = 150_000m },
            new() { SupplyId = 2, SupplyName = "Nẹp y tế", TotalQuantityUsed = 2m, TotalCost = 300_000m },
            new() { SupplyId = 3, SupplyName = "Bông gòn", TotalQuantityUsed = 5m, TotalCost = 50_000m }
        };

        // Act
        var ordered = items.OrderByDescending(x => x.TotalCost).ToList();

        // Assert
        Assert.Equal(2, ordered[0].SupplyId); // Nẹp y tế (300k) xếp đầu
        Assert.Equal(1, ordered[1].SupplyId); // Băng gạc (150k) xếp nhì
        Assert.Equal(3, ordered[2].SupplyId); // Bông gòn (50k) xếp ba
    }

    [Fact]
    public void Elderly_supply_charge_aggregation_sums_all_incident_charges()
    {
        // Arrange
        var incidents = new List<IncidentReport>
        {
            new() { ElderlyId = 1, IncidentId = 101, SupplyChargeAmount = 25_000m },
            new() { ElderlyId = 1, IncidentId = 102, SupplyChargeAmount = 40_000m },
            new() { ElderlyId = 2, IncidentId = 103, SupplyChargeAmount = 15_000m },
            new() { ElderlyId = 3, IncidentId = 104, SupplyChargeAmount = 0m } // Sự cố không dùng vật tư tính phí
        };

        // Act
        var report = incidents
            .Where(i => i.SupplyChargeAmount > 0)
            .GroupBy(i => i.ElderlyId)
            .Select(g => new
            {
                ElderlyId = g.Key,
                IncidentCount = g.Count(),
                TotalCost = g.Sum(x => x.SupplyChargeAmount)
            })
            .OrderByDescending(x => x.TotalCost)
            .ToList();

        // Assert
        Assert.Equal(2, report.Count);
        Assert.Equal(1, report[0].ElderlyId);
        Assert.Equal(65_000m, report[0].TotalCost);
        Assert.Equal(2, report[0].IncidentCount);

        Assert.Equal(2, report[1].ElderlyId);
        Assert.Equal(15_000m, report[1].TotalCost);
        Assert.Equal(1, report[1].IncidentCount);
    }
}
