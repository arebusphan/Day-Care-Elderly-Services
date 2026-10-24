namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Giờ Việt Nam (UTC+7) cho care log: "hôm nay" luôn tính theo giờ VN
/// </summary>
public static class VietnamTime
{
    /// <summary>
    /// Kind = Unspecified để JSON trả về dạng "2026-10-24T08:30:00" (không có "Z"),
    /// giống giá trị đọc từ DB, tránh FE hiểu nhầm là giờ UTC rồi cộng thêm 7 tiếng.
    /// </summary>
    public static DateTime Now => DateTime.SpecifyKind(DateTime.UtcNow.AddHours(7), DateTimeKind.Unspecified);

    public static DateOnly Today => DateOnly.FromDateTime(Now);

    /// <summary>Khoảng [00:00 ngày date, 00:00 ngày hôm sau)</summary>
    public static (DateTime From, DateTime To) DayRange(DateOnly date)
    {
        var from = date.ToDateTime(TimeOnly.MinValue);
        return (from, from.AddDays(1));
    }
}
