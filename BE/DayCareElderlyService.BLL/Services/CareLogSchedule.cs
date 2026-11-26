using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Schedule;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// Lịch hoạt động của 1 cụ theo gói đang dùng (docs/thiet-ke-lich-hoat-dong-theo-goi.md).
/// Dùng chung cho staff (CareLogService) và gia đình (FamilyCareLogService).
/// Trạng thái từng hoạt động tính từ CareLogs gắn PackageActivityId, không lưu riêng.
/// </summary>
public static class CareLogSchedule
{
    /// <summary>Gói của cụ áp cho ngày date: đăng ký Confirmed còn hiệu lực, lấy đăng ký bắt đầu gần nhất.</summary>
    public static Task<ServicePackage?> GetActivePackageAsync(AppDbContext context, int elderlyId, DateOnly date) =>
        context.ServiceRegistrations
            .Where(r => r.ElderlyId == elderlyId && r.Status == "Confirmed"
                     && r.StartDate <= date && (r.EndDate == null || r.EndDate >= date))
            .OrderByDescending(r => r.StartDate)
            .Select(r => r.Package)
            .FirstOrDefaultAsync();

    /// <summary>Hoạt động của gói áp cho cụ vào ngày date (lọc thứ, đang dùng, bệnh nền).</summary>
    public static async Task<List<PackageActivity>> GetActivitiesForDayAsync(
        AppDbContext context, int packageId, DateOnly date, HashSet<string> conditions)
    {
        var dayOfWeek = (byte)date.DayOfWeek;
        var activities = await context.PackageActivities.AsNoTracking()
            .Where(a => a.PackageId == packageId && a.IsActive && (a.DayOfWeek == null || a.DayOfWeek == dayOfWeek))
            .ToListAsync();

        return activities
            .Where(a => a.ConditionCode == null || conditions.Contains(a.ConditionCode))
            .OrderBy(a => a.StartTime).ThenBy(a => a.DisplayOrder)
            .ToList();
    }

    public static async Task<ScheduleDayDto> BuildDayAsync(AppDbContext context, ElderlyMember elderly, DateOnly date, bool includeInternal)
    {
        var conditions = ChronicConditionCodes.Parse(elderly.ChronicConditions);
        var result = new ScheduleDayDto
        {
            ElderlyId = elderly.ElderlyId,
            ElderlyName = elderly.FullName,
            Date = date,
            ChronicConditions = conditions.ToList(),
        };

        var package = await GetActivePackageAsync(context, elderly.ElderlyId, date);
        if (package == null)
        {
            return result;
        }

        result.PackageId = package.PackageId;
        result.PackageName = package.PackageName;
        if (date.DayOfWeek == DayOfWeek.Sunday)
        {
            return result;
        }

        var activities = await GetActivitiesForDayAsync(context, package.PackageId, date, conditions);
        var (from, to) = VietnamTime.DayRange(date);
        var activityIds = activities.Select(a => a.PackageActivityId).ToList();
        var logQuery = context.CareLogs.AsNoTracking()
            .Include(c => c.Staff)
            .Where(c => c.ElderlyId == elderly.ElderlyId && c.PackageActivityId != null
                     && activityIds.Contains(c.PackageActivityId.Value)
                     && c.RecordedAt >= from && c.RecordedAt < to);
        if (!includeInternal)
        {
            logQuery = logQuery.Where(c => !c.IsInternal || c.CareType == CareLogTypes.Skip);
        }
        var logs = await logQuery.OrderBy(c => c.RecordedAt).ToListAsync();

        var now = VietnamTime.Now;
        foreach (var activity in activities)
        {
            var linked = logs.Where(l => l.PackageActivityId == activity.PackageActivityId).ToList();
            var done = linked.FirstOrDefault(l => l.CareType != CareLogTypes.Skip);
            var skipped = done == null ? linked.FirstOrDefault(l => l.CareType == CareLogTypes.Skip) : null;
            var log = done ?? skipped;
            var endAt = date.ToDateTime(activity.EndTime);

            result.Items.Add(new ScheduleItemDto
            {
                PackageActivityId = activity.PackageActivityId,
                StartTime = activity.StartTime.ToString("HH:mm"),
                EndTime = activity.EndTime.ToString("HH:mm"),
                ActivityName = activity.ActivityName,
                Purpose = activity.Purpose,
                CareType = activity.CareType,
                TargetMinutes = activity.TargetMinutes,
                PerformerRole = activity.PerformerRole,
                IsRequired = activity.IsRequired,
                ConditionCode = activity.ConditionCode,
                Status = done != null ? ScheduleStatuses.Done
                    : skipped != null ? ScheduleStatuses.Skipped
                    : endAt < now ? ScheduleStatuses.Overdue
                    : ScheduleStatuses.Pending,
                CareLogId = log?.CareLogId,
                RecordedAt = log?.RecordedAt,
                StaffName = log?.Staff?.FullName,
                Note = log?.Description,
            });
        }

        var required = result.Items.Where(i => i.IsRequired).ToList();
        result.RequiredCount = required.Count;
        result.DoneCount = required.Count(i => i.Status == ScheduleStatuses.Done);
        result.SkippedCount = required.Count(i => i.Status == ScheduleStatuses.Skipped);
        return result;
    }

    /// <summary>Tổng kết tuần T2–T7 chứa ngày date: số buổi, số phút theo từng hoạt động có phút mục tiêu.</summary>
    public static async Task<ScheduleWeekDto> BuildWeekAsync(AppDbContext context, ElderlyMember elderly, DateOnly date)
    {
        var offset = date.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)date.DayOfWeek - 1;
        var weekStart = date.AddDays(-offset);
        var weekEnd = weekStart.AddDays(5);
        var result = new ScheduleWeekDto { ElderlyId = elderly.ElderlyId, WeekStart = weekStart, WeekEnd = weekEnd };

        var package = await GetActivePackageAsync(context, elderly.ElderlyId, date);
        if (package == null)
        {
            return result;
        }
        result.PackageName = package.PackageName;

        var conditions = ChronicConditionCodes.Parse(elderly.ChronicConditions);
        var activities = (await context.PackageActivities.AsNoTracking()
                .Where(a => a.PackageId == package.PackageId && a.IsActive && a.TargetMinutes != null)
                .ToListAsync())
            .Where(a => a.ConditionCode == null || conditions.Contains(a.ConditionCode))
            .ToList();

        var from = VietnamTime.DayRange(weekStart).From;
        var to = VietnamTime.DayRange(weekEnd).To;
        var ids = activities.Select(a => a.PackageActivityId).ToList();
        var logs = await context.CareLogs.AsNoTracking()
            .Where(c => c.ElderlyId == elderly.ElderlyId && c.PackageActivityId != null
                     && ids.Contains(c.PackageActivityId.Value)
                     && c.RecordedAt >= from && c.RecordedAt < to)
            .Select(c => new { c.PackageActivityId, c.CareType, Day = c.RecordedAt.Date })
            .ToListAsync();

        foreach (var group in activities.GroupBy(a => a.ActivityName))
        {
            var item = new ScheduleWeekItemDto { ActivityName = group.Key };
            foreach (var activity in group)
            {
                var sessions = activity.DayOfWeek == null ? 6 : 1;
                item.PlannedSessions += sessions;
                item.PlannedMinutes += sessions * (activity.TargetMinutes ?? 0);

                var linked = logs.Where(l => l.PackageActivityId == activity.PackageActivityId).ToList();
                var doneDays = linked.Where(l => l.CareType != CareLogTypes.Skip).Select(l => l.Day).Distinct().Count();
                var skippedDays = linked.Where(l => l.CareType == CareLogTypes.Skip).Select(l => l.Day).Distinct().Count();
                item.DoneSessions += doneDays;
                item.SkippedSessions += skippedDays;
                item.DoneMinutes += doneDays * (activity.TargetMinutes ?? 0);
            }
            result.Items.Add(item);
        }

        result.Items = result.Items.OrderByDescending(i => i.PlannedMinutes).ToList();
        result.ActivityMinutesPlanned = result.Items.Sum(i => i.PlannedMinutes);
        result.ActivityMinutesDone = result.Items.Sum(i => i.DoneMinutes);
        return result;
    }

    /// <summary>
    /// Kiểm tra PackageActivityId khi ghi care log hôm nay: thuộc gói của cụ, đúng thứ, đúng bệnh nền,
    /// đúng loại care log, và chưa được ghi / bỏ qua.
    /// </summary>
    public static async Task<string?> ValidateLinkAsync(AppDbContext context, ElderlyMember elderly, int packageActivityId, string careType)
    {
        var today = VietnamTime.Today;
        var package = await GetActivePackageAsync(context, elderly.ElderlyId, today);
        if (package == null)
        {
            return "Cụ chưa có gói dịch vụ còn hiệu lực hôm nay nên không gắn được hoạt động trong lịch.";
        }

        var activities = await GetActivitiesForDayAsync(context, package.PackageId, today, ChronicConditionCodes.Parse(elderly.ChronicConditions));
        var activity = activities.FirstOrDefault(a => a.PackageActivityId == packageActivityId);
        if (activity == null)
        {
            return "Hoạt động không có trong lịch hôm nay của cụ.";
        }

        if (careType != CareLogTypes.Skip && !string.Equals(activity.CareType, careType, StringComparison.OrdinalIgnoreCase))
        {
            return $"Hoạt động \"{activity.ActivityName}\" cần ghi loại {activity.CareType}.";
        }

        var (from, to) = VietnamTime.DayRange(today);
        var already = await context.CareLogs.AnyAsync(c => c.ElderlyId == elderly.ElderlyId
            && c.PackageActivityId == packageActivityId && c.RecordedAt >= from && c.RecordedAt < to);
        return already ? $"Hoạt động \"{activity.ActivityName}\" hôm nay đã được ghi hoặc đã bỏ qua." : null;
    }
}
