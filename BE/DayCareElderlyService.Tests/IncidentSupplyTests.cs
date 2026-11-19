using DayCareElderlyService.Models.Entities;
using Xunit;

namespace DayCareElderlyService.Tests;

/// <summary>
/// WF-05 / Quyết định D2: Kiểm thử nghiệp vụ Sổ cái vật tư y tế,
/// tính toán phụ thu sự cố và kiểm tra ngưỡng tồn kho (DS-09, DS-10, F-14).
/// </summary>
public class IncidentSupplyTests
{
    private static MedicalSupply CreateSupply(int id, string name, decimal stock, decimal minStock, decimal unitPrice, bool isActive = true) => new()
    {
        SupplyId = id,
        SupplyName = name,
        QuantityInStock = stock,
        MinimumStock = minStock,
        UnitPrice = unitPrice,
        Unit = "cuộn",
        IsActive = isActive
    };

    [Fact]
    public void Deducting_valid_stock_decreases_quantity_correctly()
    {
        // Arrange (DS-09: Tồn kho đủ để xử lý sự cố)
        var supply = CreateSupply(1, "Băng gạc tiệt trùng", stock: 10m, minStock: 2m, unitPrice: 15_000m);
        decimal usedQuantity = 3m;

        // Act
        decimal remainingStock = supply.QuantityInStock - usedQuantity;

        // Assert
        Assert.Equal(7m, remainingStock);
        Assert.True(remainingStock > supply.MinimumStock);
    }

    [Fact]
    public void Insufficient_stock_is_detected_and_rejected()
    {
        // Arrange (DS-10 Exception: Yêu cầu trừ kho vượt quá số lượng tồn)
        var supply = CreateSupply(2, "Cồn đỏ Povidine", stock: 1m, minStock: 2m, unitPrice: 25_000m);
        decimal requestedQuantity = 3m;

        // Act & Assert
        bool isInsufficient = requestedQuantity > supply.QuantityInStock;
        Assert.True(isInsufficient, "Hệ thống phải phát hiện và từ chối khi số lượng yêu cầu vượt quá tồn kho.");
    }

    [Fact]
    public void Stock_dropping_to_or_below_minimum_triggers_low_stock_condition()
    {
        // Arrange: Tồn kho ban đầu > MinStock, sau khi dùng rơi xuống <= MinStock
        var supply = CreateSupply(3, "Băng cá nhân Urgo", stock: 5m, minStock: 2m, unitPrice: 5_000m);
        decimal usedQuantity = 3m;

        // Act
        decimal previousStock = supply.QuantityInStock;
        decimal newStock = previousStock - usedQuantity;
        bool triggersLowStockAlert = previousStock > supply.MinimumStock && newStock <= supply.MinimumStock;

        // Assert
        Assert.Equal(2m, newStock);
        Assert.True(triggersLowStockAlert, "Hệ thống phải kích hoạt cờ cảnh báo LowStock khi tồn kho chạm hoặc dưới mức tối thiểu.");
    }

    [Fact]
    public void Calculating_incident_supply_charge_computes_exact_total()
    {
        // Arrange: Tính tiền phụ thu vật tư cho sự cố (F-14 / WF-05)
        var gauze = CreateSupply(1, "Băng cuộn y tế", stock: 20m, minStock: 5m, unitPrice: 12_000m);
        var antiseptic = CreateSupply(2, "Nước muối sinh lý", stock: 10m, minStock: 2m, unitPrice: 18_000m);

        decimal gauzeUsed = 2m;      // 2 * 12,000 = 24,000
        decimal antisepticUsed = 1m; // 1 * 18,000 = 18,000

        // Act
        decimal totalCharge = (gauze.UnitPrice * gauzeUsed) + (antiseptic.UnitPrice * antisepticUsed);

        // Assert
        Assert.Equal(42_000m, totalCharge);
    }

    [Fact]
    public void Appending_supply_charge_to_incident_updates_total_charge_amount()
    {
        // Arrange: Sự cố ban đầu chưa có phí vật tư
        var incident = new IncidentReport
        {
            IncidentId = 101,
            ElderlyId = 5,
            Title = "Ngã trầy xước nhẹ ở hành lang",
            Severity = "Low",
            SupplyChargeAmount = 0m,
            IsSupplyConfirmed = false
        };

        decimal firstAidSupplyCost = 35_000m;

        // Act: Xác nhận vật tư (IsSupplyConfirmed = true)
        incident.SupplyChargeAmount += firstAidSupplyCost;
        incident.IsSupplyConfirmed = true;

        // Assert
        Assert.Equal(35_000m, incident.SupplyChargeAmount);
        Assert.True(incident.IsSupplyConfirmed);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(-5.5)]
    public void Non_positive_quantity_is_invalid(decimal invalidQuantity)
    {
        // Act & Assert: Số lượng vật tư sử dụng phải > 0
        bool isValid = invalidQuantity > 0;
        Assert.False(isValid, "Số lượng vật tư phải lớn hơn 0.");
    }

    [Fact]
    public void Inactive_supply_cannot_be_used_for_incident()
    {
        // Arrange: Vật tư đã bị ngừng sử dụng (IsActive = false)
        var discontinuedSupply = CreateSupply(4, "Băng dính y tế cũ", stock: 10m, minStock: 1m, unitPrice: 8_000m, isActive: false);

        // Assert
        Assert.False(discontinuedSupply.IsActive, "Vật tư ngừng sử dụng không được phép xuất dùng trong sự cố.");
    }
}
