using System.Globalization;

namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Chuẩn hoá / parse giờ uống thuốc lưu trên MedicationPlans.ScheduleTimes
/// </summary>
public static class MedicationSchedule
{
    public static (string? Stored, List<TimeOnly>? Times, string? Error) Normalize(IEnumerable<string>? rawTimes)
    {
        var parsed = new SortedSet<TimeOnly>();
        foreach (var raw in rawTimes ?? Enumerable.Empty<string>())
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                continue;
            }

            if (!TimeOnly.TryParseExact(raw.Trim(), new[] { "HH:mm", "H:mm" }, CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var time))
            {
                return (null, null, $"Giờ uống \"{raw}\" không hợp lệ. Dùng dạng HH:mm (ví dụ 08:00).");
            }

            parsed.Add(time);
        }

        if (parsed.Count == 0)
        {
            return (null, null, "Vui lòng nhập ít nhất một giờ uống.");
        }

        var list = parsed.ToList();
        var stored = string.Join(",", list.Select(t => t.ToString("HH:mm", CultureInfo.InvariantCulture)));
        return (stored, list, null);
    }

    public static List<TimeOnly> Parse(string? scheduleTimes)
    {
        var (_, times, _) = Normalize(
            (scheduleTimes ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        return times ?? new List<TimeOnly> { new(8, 0) };
    }

    public static List<string> ToLabels(string? scheduleTimes) =>
        Parse(scheduleTimes).Select(t => t.ToString("HH:mm", CultureInfo.InvariantCulture)).ToList();
}
