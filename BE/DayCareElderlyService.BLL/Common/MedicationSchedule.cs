using System.Globalization;

namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Parse giờ uống từ request. Không lưu cột riêng trên MedicationPlans —
/// lịch cụ thể nằm ở MedicationRecords.ScheduledAt.
/// </summary>
public static class MedicationSchedule
{
    public static (List<TimeOnly>? Times, string? Error) ParseTimes(IEnumerable<string>? rawTimes)
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
                return (null, $"Giờ uống \"{raw}\" không hợp lệ. Dùng dạng HH:mm (ví dụ 08:00).");
            }

            parsed.Add(time);
        }

        if (parsed.Count == 0)
        {
            return (null, "Vui lòng nhập ít nhất một giờ uống.");
        }

        return (parsed.ToList(), null);
    }

    public static List<string> ToLabels(IEnumerable<TimeOnly> times) =>
        times.OrderBy(t => t).Select(t => t.ToString("HH:mm", CultureInfo.InvariantCulture)).ToList();

    public static List<string> InferLabelsFromScheduledAts(IEnumerable<DateTime> scheduledAts) =>
        ToLabels(scheduledAts.Select(TimeOnly.FromDateTime).Distinct());
}
