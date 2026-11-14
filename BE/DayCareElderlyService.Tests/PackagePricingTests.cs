using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.Models.Entities;
using Xunit;

namespace DayCareElderlyService.Tests;

/// <summary>BR-83: kiểm tra công thức tính tiền gói phía server.</summary>
public class PackagePricingTests
{
    private static ServicePackage Basic() => new()
    {
        PackageName = "Gói Cơ bản",
        PricePerDay = 300_000m,
        PriceMonthFullWeek = 6_000_000m,
        PriceMonth3Days = 3_300_000m,
    };

    private static ServicePackage EndOfLife() => new()
    {
        PackageName = "Gói chăm sóc giai đoạn cuối",
        PricePerDay = 900_000m,
        PriceMonthFullWeek = 18_000_000m,
        PriceMonth3Days = 9_900_000m,
    };

    private static ElderlyMember Elderly(string mobility) => new() { MobilityStatus = mobility };

    [Fact]
    public void Daily_normal_large_room_is_price_times_days()
    {
        var q = PackagePricing.Calculate(Basic(), Elderly("Normal"), "daily", null, 3, "large");
        Assert.Equal(900_000m, q.PackagePrice);
        Assert.Equal(0m, q.SupportSurcharge);
        Assert.Equal(0m, q.RoomSurcharge);
        Assert.Equal(900_000m, q.Total);
    }

    [Theory]
    [InlineData("Support")]
    [InlineData("Cần hỗ trợ")]
    public void Daily_basic_support_adds_75k_per_day(string mobility)
    {
        var q = PackagePricing.Calculate(Basic(), Elderly(mobility), "daily", null, 2, "large");
        Assert.Equal(150_000m, q.SupportSurcharge);
        Assert.Equal(750_000m, q.Total);
    }

    [Fact]
    public void Daily_small_room_adds_60k_per_day()
    {
        var q = PackagePricing.Calculate(Basic(), Elderly("Normal"), "daily", null, 2, "small");
        Assert.Equal(120_000m, q.RoomSurcharge);
    }

    [Fact]
    public void End_of_life_has_no_room_or_support_surcharge()
    {
        var q = PackagePricing.Calculate(EndOfLife(), Elderly("Support"), "daily", null, 1, "small");
        Assert.Equal(0m, q.SupportSurcharge);
        Assert.Equal(0m, q.RoomSurcharge);
        Assert.Equal(900_000m, q.Total);
    }

    [Fact]
    public void Monthly_full_week_with_support_and_small_room()
    {
        var q = PackagePricing.Calculate(Basic(), Elderly("Support"), "monthly", "all", 0, "small");
        Assert.Equal(6_000_000m, q.PackagePrice);
        Assert.Equal(1_500_000m, q.SupportSurcharge);
        Assert.Equal(1_200_000m, q.RoomSurcharge);
        Assert.Equal(8_700_000m, q.Total);
    }

    [Theory]
    [InlineData("mwf")]
    [InlineData("tts")]
    public void Monthly_three_days_uses_reduced_prices(string pattern)
    {
        var q = PackagePricing.Calculate(Basic(), Elderly("Support"), "monthly", pattern, 0, "small");
        Assert.Equal(3_300_000m, q.PackagePrice);
        Assert.Equal(825_000m, q.SupportSurcharge);
        Assert.Equal(660_000m, q.RoomSurcharge);
    }
}
