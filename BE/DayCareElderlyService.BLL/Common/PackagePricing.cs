using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// BR-83: tổng tiền gói do SERVER tính, không lấy từ client.
/// Công thức giữ đúng như FE đang hiển thị (ServicePackagesView.calculatePrice):
/// - Theo ngày: giá/ngày × số ngày; phụ phí hỗ trợ 75.000/ngày (chỉ gói Cơ bản, cụ cần hỗ trợ);
///   phụ phí phòng 1–2 người 60.000/ngày (trừ gói giai đoạn cuối).
/// - Theo tháng: giá tháng cả tuần hoặc 3 ngày/tuần; phụ phí hỗ trợ 1.500.000 / 825.000;
///   phụ phí phòng 1.200.000 / 660.000.
/// </summary>
public static class PackagePricing
{
    public const decimal SupportPerDay = 75_000m;
    public const decimal SmallRoomPerDay = 60_000m;
    public const decimal SupportMonthFullWeek = 1_500_000m;
    public const decimal SupportMonth3Days = 825_000m;
    public const decimal SmallRoomMonthFullWeek = 1_200_000m;
    public const decimal SmallRoomMonth3Days = 660_000m;

    public static readonly string[] MonthlyPatterns = { "all", "mwf", "tts" };

    public record Quote(decimal PackagePrice, decimal SupportSurcharge, decimal RoomSurcharge)
    {
        public decimal Total => PackagePrice + SupportSurcharge + RoomSurcharge;
    }

    public static bool IsBasic(ServicePackage pkg) =>
        pkg.PackageName.Contains("cơ bản", StringComparison.OrdinalIgnoreCase);

    public static bool IsEndOfLife(ServicePackage pkg) =>
        pkg.EndOfLifeRoomIncluded || pkg.PackageName.Contains("giai đoạn cuối", StringComparison.OrdinalIgnoreCase);

    public static bool NeedsSupport(ElderlyMember elderly) =>
        elderly.MobilityStatus is "Support" or "Cần hỗ trợ";

    /// <param name="registrationType">"daily" | "monthly"</param>
    /// <param name="monthlyPattern">"all" | "mwf" | "tts" (chỉ dùng cho monthly)</param>
    /// <param name="numDays">số ngày đến trung tâm (chỉ dùng cho daily)</param>
    /// <param name="roomType">"large" | "small"</param>
    public static Quote Calculate(ServicePackage pkg, ElderlyMember elderly, string registrationType,
        string? monthlyPattern, int numDays, string? roomType)
    {
        var support = IsBasic(pkg) && NeedsSupport(elderly);
        var smallRoom = string.Equals(roomType, "small", StringComparison.OrdinalIgnoreCase) && !IsEndOfLife(pkg);

        if (string.Equals(registrationType, "daily", StringComparison.OrdinalIgnoreCase))
        {
            return new Quote(
                pkg.PricePerDay * numDays,
                support ? SupportPerDay * numDays : 0m,
                smallRoom ? SmallRoomPerDay * numDays : 0m);
        }

        var fullWeek = string.Equals(monthlyPattern, "all", StringComparison.OrdinalIgnoreCase);
        return new Quote(
            fullWeek ? pkg.PriceMonthFullWeek : pkg.PriceMonth3Days,
            support ? (fullWeek ? SupportMonthFullWeek : SupportMonth3Days) : 0m,
            smallRoom ? (fullWeek ? SmallRoomMonthFullWeek : SmallRoomMonth3Days) : 0m);
    }
}
