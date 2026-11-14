using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.Models.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Tổng quan & báo cáo (F-15): dashboard Manager, báo cáo theo khoảng ngày,
/// tổng quan ca trực của Staff và tổng quan hoạt động của Family. Chỉ đọc.
/// </summary>
[ApiController]
[Route("api")]
public class OverviewController : ControllerBase
{
    private const string Pending = "Pending", Given = "Given", Refused = "Refused", Missed = "Missed";
    private readonly AppDbContext _context;

    public OverviewController(AppDbContext context)
    {
        _context = context;
    }

    // ───────── Manager: dashboard hôm nay ─────────

    [HttpGet("center/dashboard")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    public async Task<IActionResult> CenterDashboard([FromQuery] DateOnly? date)
    {
        var day = date ?? VietnamTime.Today;
        var (from, to) = VietnamTime.DayRange(day);
        var now = VietnamTime.Now;

        var plan = await _context.DailySchedulePlans.AsNoTracking().FirstOrDefaultAsync(p => p.PlanDate == day);
        var nextDay = NextWorkingDay(day);
        var nextPlan = await _context.DailySchedulePlans.AsNoTracking().FirstOrDefaultAsync(p => p.PlanDate == nextDay);
        var expected = plan == null ? 0 : await _context.DailyAttendanceForecasts
            .CountAsync(f => f.PlanId == plan.PlanId && f.AttendanceStatus == "Expected");

        var attendance = await _context.AttendanceRecords.AsNoTracking()
            .Where(a => a.AttendanceDate == day && a.CheckInAt != null)
            .Select(a => new { a.CheckOutAt })
            .ToListAsync();
        var absences = await _context.AbsenceReports.CountAsync(a => a.AbsenceDate == day);

        var doses = await _context.MedicationRecords.AsNoTracking()
            .Where(r => r.ScheduledAt >= from && r.ScheduledAt < to)
            .Select(r => new { r.Status, r.ScheduledAt })
            .ToListAsync();

        var openIncidents = await _context.IncidentReports.AsNoTracking()
            .Where(i => i.Status != "Resolved")
            .GroupBy(i => i.Severity)
            .Select(g => new { Severity = g.Key, Count = g.Count() })
            .ToListAsync();
        var incidentsToday = await _context.IncidentReports.CountAsync(i => i.OccurredAt >= from && i.OccurredAt < to);

        var lowStock = await _context.MedicalSupplies.AsNoTracking()
            .Where(s => s.IsActive && s.QuantityInStock <= s.MinimumStock)
            .OrderBy(s => s.QuantityInStock)
            .Select(s => new { s.SupplyId, s.SupplyName, s.QuantityInStock, s.MinimumStock, s.Unit })
            .ToListAsync();
        var expiringSoon = await _context.MedicalSupplies.CountAsync(s =>
            s.IsActive && s.ExpiryDate != null && s.ExpiryDate <= day.AddDays(30));

        var pendingRequests = await _context.StaffRequests.CountAsync(r => r.Status == "Pending");
        var careLogsToday = await _context.CareLogs.CountAsync(c => c.RecordedAt >= from && c.RecordedAt < to);
        var closedToday = await _context.CareLogs.CountAsync(c => c.RecordedAt >= from && c.RecordedAt < to && c.CareType == "CLOSE");

        var data = new
        {
            Date = day,
            Plan = plan == null ? null : new { plan.PlanId, plan.Status, plan.TotalElderly, plan.TotalStaff },
            NextPlan = new { Date = nextDay, Status = nextPlan?.Status ?? "Chưa lập" },
            Attendance = new
            {
                Expected = expected,
                CheckedIn = attendance.Count,
                Present = attendance.Count(a => a.CheckOutAt == null),
                Left = attendance.Count(a => a.CheckOutAt != null),
                AbsenceReported = absences
            },
            Medication = new
            {
                Total = doses.Count,
                Given = doses.Count(d => d.Status == Given),
                Refused = doses.Count(d => d.Status == Refused),
                Missed = doses.Count(d => d.Status == Missed),
                Pending = doses.Count(d => d.Status == Pending),
                Overdue = doses.Count(d => d.Status == Pending && d.ScheduledAt <= now.AddMinutes(-30))
            },
            Incidents = new
            {
                Today = incidentsToday,
                Open = openIncidents.Sum(x => x.Count),
                OpenBySeverity = openIncidents
            },
            CareLogs = new { Entries = careLogsToday, Closed = closedToday },
            Supplies = new { LowStock = lowStock, ExpiringIn30Days = expiringSoon },
            PendingStaffRequests = pendingRequests
        };
        return Ok(ApiResponse<object>.Ok(data, "Lấy tổng quan trung tâm thành công."));
    }

    // ───────── Manager: báo cáo theo khoảng ngày ─────────

    [HttpGet("center/reports")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    public async Task<IActionResult> CenterReports([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var end = to ?? VietnamTime.Today;
        var start = from ?? end.AddDays(-29);
        if (start > end) return BadRequest(ApiResponse<object>.Fail("Từ ngày phải trước đến ngày."));
        if (end.DayNumber - start.DayNumber > 366) return BadRequest(ApiResponse<object>.Fail("Khoảng báo cáo tối đa 1 năm."));
        var (fromAt, _) = VietnamTime.DayRange(start);
        var (_, toAt) = VietnamTime.DayRange(end);

        var attendanceByDay = await _context.AttendanceRecords.AsNoTracking()
            .Where(a => a.AttendanceDate >= start && a.AttendanceDate <= end && a.CheckInAt != null)
            .GroupBy(a => a.AttendanceDate)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        var incidents = await _context.IncidentReports.AsNoTracking()
            .Where(i => i.OccurredAt >= fromAt && i.OccurredAt < toAt)
            .Select(i => new { i.IncidentType, i.Severity, i.Status, i.SupplyChargeAmount })
            .ToListAsync();

        var doses = await _context.MedicationRecords.AsNoTracking()
            .Where(r => r.ScheduledAt >= fromAt && r.ScheduledAt < toAt && r.ScheduledAt <= VietnamTime.Now)
            .Select(r => r.Status)
            .ToListAsync();

        var revenue = await _context.Payments.AsNoTracking()
            .Where(p => p.PaymentStatus == "Paid" && p.PaidAt >= fromAt && p.PaidAt < toAt)
            .SumAsync(p => (decimal?)p.Amount) ?? 0m;
        var registrations = await _context.ServiceRegistrations
            .CountAsync(r => r.CreatedAt >= fromAt && r.CreatedAt < toAt);

        var supplyUsage = await _context.SupplyTransactions.AsNoTracking()
            .Where(t => t.OccurredAt >= fromAt && t.OccurredAt < toAt && (t.TransactionType == "OUT" || t.TransactionType == "INCIDENT"))
            .GroupBy(t => new { t.SupplyId, t.Supply.SupplyName, t.Supply.Unit })
            .Select(g => new { g.Key.SupplyId, g.Key.SupplyName, g.Key.Unit, Quantity = g.Sum(x => x.Quantity) })
            .OrderByDescending(x => x.Quantity)
            .Take(10)
            .ToListAsync();

        var staffWork = await _context.StaffCareAssignments.AsNoTracking()
            .Where(a => a.Plan.PlanDate >= start && a.Plan.PlanDate <= end)
            .GroupBy(a => new { a.StaffId, a.Staff.FullName })
            .Select(g => new { g.Key.StaffId, g.Key.FullName, Assignments = g.Count(), Days = g.Select(x => x.Plan.PlanDate).Distinct().Count() })
            .OrderByDescending(x => x.Assignments)
            .ToListAsync();

        var recordedDoses = doses.Count(s => s != Pending);
        var data = new
        {
            From = start,
            To = end,
            Attendance = new
            {
                TotalVisits = attendanceByDay.Sum(x => x.Count),
                AveragePerDay = attendanceByDay.Count == 0 ? 0 : Math.Round(attendanceByDay.Average(x => x.Count), 1),
                ByDay = attendanceByDay
            },
            Incidents = new
            {
                Total = incidents.Count,
                Resolved = incidents.Count(i => i.Status == "Resolved"),
                BySeverity = incidents.GroupBy(i => i.Severity).Select(g => new { Severity = g.Key, Count = g.Count() }),
                ByType = incidents.GroupBy(i => i.IncidentType).Select(g => new { Type = g.Key, Count = g.Count() }).OrderByDescending(x => x.Count).Take(8),
                SupplyCharges = incidents.Sum(i => i.SupplyChargeAmount)
            },
            Medication = new
            {
                Due = doses.Count,
                Given = doses.Count(s => s == Given),
                Refused = doses.Count(s => s == Refused),
                Missed = doses.Count(s => s == Missed),
                NotRecorded = doses.Count(s => s == Pending),
                ComplianceRate = recordedDoses == 0 ? 0 : Math.Round(100.0 * doses.Count(s => s == Given) / doses.Count, 1)
            },
            Revenue = new { PaidAmount = revenue, NewRegistrations = registrations },
            SupplyUsage = supplyUsage,
            StaffWorkload = staffWork
        };
        return Ok(ApiResponse<object>.Ok(data, "Lấy báo cáo thành công."));
    }

    // ───────── Staff: tổng quan ca trực ─────────

    [HttpGet("staff/overview")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> StaffOverview()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        var today = VietnamTime.Today;
        var (from, to) = VietnamTime.DayRange(today);
        var now = VietnamTime.Now;

        var planIds = await _context.DailySchedulePlans
            .Where(p => p.PlanDate == today && (p.Status == "Published" || p.Status == "Confirmed"))
            .Select(p => p.PlanId).ToListAsync();
        var group = await _context.DailyCareGroups.AsNoTracking()
            .Where(g => planIds.Contains(g.PlanId) && g.StaffId == userId)
            .Select(g => new { g.GroupName, g.GroupType })
            .FirstOrDefaultAsync();
        var assigned = (await _context.CareGroupMembers
                .Where(m => planIds.Contains(m.Group.PlanId) && m.Group.StaffId == userId).Select(m => m.ElderlyId).ToListAsync())
            .Concat(await _context.StaffCareAssignments
                .Where(a => planIds.Contains(a.PlanId) && a.StaffId == userId).Select(a => a.ElderlyId).ToListAsync())
            .Distinct().ToList();

        var members = await _context.ElderlyMembers.AsNoTracking()
            .Where(e => assigned.Contains(e.ElderlyId))
            .Select(e => new { e.ElderlyId, e.FullName, e.Allergies })
            .ToListAsync();
        var attendance = await _context.AttendanceRecords.AsNoTracking()
            .Where(a => a.AttendanceDate == today && assigned.Contains(a.ElderlyId))
            .Select(a => new { a.ElderlyId, a.CheckInAt, a.CheckOutAt })
            .ToListAsync();
        var logs = await _context.CareLogs.AsNoTracking()
            .Where(c => assigned.Contains(c.ElderlyId) && c.RecordedAt >= from && c.RecordedAt < to)
            .Select(c => new { c.ElderlyId, c.CareType })
            .ToListAsync();
        var doses = await _context.MedicationRecords.AsNoTracking()
            .Where(r => assigned.Contains(r.MedicationPlan.ElderlyId) && r.ScheduledAt >= from && r.ScheduledAt < to)
            .Select(r => new { r.MedicationRecordId, r.Status, r.ScheduledAt, r.MedicationPlan.MedicationName, r.MedicationPlan.Elderly.FullName })
            .ToListAsync();
        var absences = await _context.AbsenceReports.AsNoTracking()
            .Where(a => a.AbsenceDate == today && assigned.Contains(a.ElderlyId))
            .Select(a => a.ElderlyId).ToListAsync();
        var openIncidents = await _context.IncidentReports
            .CountAsync(i => assigned.Contains(i.ElderlyId) && i.Status != "Resolved");
        var unread = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        var data = new
        {
            Date = today,
            HasPublishedPlan = planIds.Count > 0,
            Group = group,
            Members = members.Select(m =>
            {
                var att = attendance.FirstOrDefault(a => a.ElderlyId == m.ElderlyId);
                var mLogs = logs.Where(l => l.ElderlyId == m.ElderlyId).ToList();
                return new
                {
                    m.ElderlyId,
                    m.FullName,
                    m.Allergies,
                    Status = absences.Contains(m.ElderlyId) ? "Absent"
                        : att?.CheckOutAt != null ? "Left"
                        : att?.CheckInAt != null ? "Present" : "NotArrived",
                    att?.CheckInAt,
                    att?.CheckOutAt,
                    Entries = mLogs.Count,
                    HasVitals = mLogs.Any(l => l.CareType == "VITALS"),
                    MedicalDone = mLogs.Any(l => l.CareType == "MEDICAL_DONE"),
                    Closed = mLogs.Any(l => l.CareType == "CLOSE")
                };
            }),
            Doses = new
            {
                Total = doses.Count,
                Pending = doses.Count(d => d.Status == Pending),
                Overdue = doses.Count(d => d.Status == Pending && d.ScheduledAt <= now.AddMinutes(-30)),
                Next = doses.Where(d => d.Status == Pending).OrderBy(d => d.ScheduledAt).Take(5)
                    .Select(d => new { d.MedicationRecordId, d.ScheduledAt, d.MedicationName, ElderlyName = d.FullName })
            },
            OpenIncidents = openIncidents,
            UnreadNotifications = unread
        };
        return Ok(ApiResponse<object>.Ok(data, "Lấy tổng quan ca trực thành công."));
    }

    // ───────── Family: tổng quan hoạt động ─────────

    [HttpGet("family/overview")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> FamilyOverview()
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        var today = VietnamTime.Today;
        var (from, to) = VietnamTime.DayRange(today);

        var elderlyIds = await _context.ElderlyFamilyRelationships
            .Where(r => r.FamilyMember.UserId == userId && r.Elderly.IsActive)
            .Select(r => r.ElderlyId).ToListAsync();

        var members = await _context.ElderlyMembers.AsNoTracking()
            .Where(e => elderlyIds.Contains(e.ElderlyId))
            .Select(e => new { e.ElderlyId, e.FullName })
            .ToListAsync();
        var attendance = await _context.AttendanceRecords.AsNoTracking()
            .Where(a => a.AttendanceDate == today && elderlyIds.Contains(a.ElderlyId))
            .Select(a => new { a.ElderlyId, a.CheckInAt, a.CheckOutAt, PickupName = a.PickupPerson != null ? a.PickupPerson.FullName : null })
            .ToListAsync();
        var logs = await _context.CareLogs.AsNoTracking()
            .Where(c => elderlyIds.Contains(c.ElderlyId) && c.RecordedAt >= from && c.RecordedAt < to && !c.IsInternal)
            .OrderByDescending(c => c.RecordedAt)
            .Select(c => new { c.ElderlyId, c.CareType, c.Description, c.RecordedAt, c.BloodPressure, c.BloodGlucose })
            .ToListAsync();
        var doses = await _context.MedicationRecords.AsNoTracking()
            .Where(r => elderlyIds.Contains(r.MedicationPlan.ElderlyId) && r.ScheduledAt >= from && r.ScheduledAt < to)
            .Select(r => new { r.MedicationPlan.ElderlyId, r.Status })
            .ToListAsync();
        var incidents = await _context.IncidentReports.AsNoTracking()
            .Where(i => elderlyIds.Contains(i.ElderlyId) && i.Status != "Resolved")
            .Select(i => new { i.ElderlyId, i.IncidentType, i.Severity, i.OccurredAt })
            .ToListAsync();
        var packages = await _context.ServiceRegistrations.AsNoTracking()
            .Where(r => elderlyIds.Contains(r.ElderlyId) && r.Status == "Confirmed" && (r.EndDate == null || r.EndDate >= today))
            .Select(r => new { r.ElderlyId, r.Package.PackageName, r.EndDate })
            .ToListAsync();
        var absences = await _context.AbsenceReports.AsNoTracking()
            .Where(a => elderlyIds.Contains(a.ElderlyId) && a.AbsenceDate >= today)
            .Select(a => new { a.ElderlyId, a.AbsenceDate })
            .ToListAsync();
        var unread = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        var data = new
        {
            Date = today,
            UnreadNotifications = unread,
            Members = members.Select(m =>
            {
                var att = attendance.FirstOrDefault(a => a.ElderlyId == m.ElderlyId);
                var mLogs = logs.Where(l => l.ElderlyId == m.ElderlyId).ToList();
                var vitals = mLogs.FirstOrDefault(l => l.CareType == "VITALS");
                var mDoses = doses.Where(d => d.ElderlyId == m.ElderlyId).ToList();
                return new
                {
                    m.ElderlyId,
                    m.FullName,
                    Status = absences.Any(a => a.ElderlyId == m.ElderlyId && a.AbsenceDate == today) ? "Absent"
                        : att?.CheckOutAt != null ? "Left"
                        : att?.CheckInAt != null ? "Present" : "NotArrived",
                    att?.CheckInAt,
                    att?.CheckOutAt,
                    att?.PickupName,
                    EntriesToday = mLogs.Count,
                    LatestActivity = mLogs.Select(l => new { l.CareType, l.Description, l.RecordedAt }).FirstOrDefault(),
                    LatestVitals = vitals == null ? null : new { vitals.RecordedAt, vitals.BloodPressure, vitals.BloodGlucose },
                    Doses = new { Total = mDoses.Count, Given = mDoses.Count(d => d.Status == Given), Pending = mDoses.Count(d => d.Status == Pending) },
                    OpenIncidents = incidents.Where(i => i.ElderlyId == m.ElderlyId),
                    Packages = packages.Where(p => p.ElderlyId == m.ElderlyId).Select(p => new { p.PackageName, p.EndDate }),
                    UpcomingAbsences = absences.Where(a => a.ElderlyId == m.ElderlyId).Select(a => a.AbsenceDate).OrderBy(d => d)
                };
            })
        };
        return Ok(ApiResponse<object>.Ok(data, "Lấy tổng quan hoạt động thành công."));
    }

    private static DateOnly NextWorkingDay(DateOnly day)
    {
        var next = day.AddDays(1);
        return next.DayOfWeek == DayOfWeek.Sunday ? next.AddDays(1) : next;
    }

    private int? CurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;
}
