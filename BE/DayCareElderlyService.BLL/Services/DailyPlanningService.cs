using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.DailyPlanning;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class DailyPlanningService : IDailyPlanningService
{
    private readonly AppDbContext _context;
    private const int MaxNormalPerStaff = 10;
    private const int MaxSupportPerStaff = 4;

    public DailyPlanningService(AppDbContext context)
    {
        _context = context;
    }

    private static DateOnly GetVietnamToday()
        => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    private static bool IsSupport(ElderlyMember? e)
        => string.Equals(e?.MobilityStatus?.Trim(), "Support", StringComparison.OrdinalIgnoreCase);

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return "Expected";
        var s = status.Trim().ToLowerInvariant();
        if (s == "attending" || s == "expected") return "Expected";
        if (s == "absent") return "Absent";
        if (s == "notconfirmed" || s == "not_confirmed" || s == "not confirmed") return "NotConfirmed";
        return "Expected";
    }

    // ════════════════════════════════════════════════════════════════════
    // INIT PLAN
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<DailyPlanSummaryDto>> GetOrInitPlanAsync(DateOnly date, int centerId)
    {
        if (date.DayOfWeek == DayOfWeek.Sunday)
            return ApiResponse<DailyPlanSummaryDto>.Fail("Chủ nhật trung tâm đóng cửa.");

        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts)
            .Include(p => p.CareGroups).ThenInclude(g => g.Members)
            .Include(p => p.Assignments)
            .FirstOrDefaultAsync(p => p.PlanDate == date);

        if (plan == null)
        {
            plan = new DailySchedulePlan
            {
                PlanDate = date,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow
            };
            await _context.DailySchedulePlans.AddAsync(plan);
            await _context.SaveChangesAsync();

            await InitAttendanceForecastAsync(plan.PlanId, centerId, date);
        }
        else if (plan.AttendanceForecasts.Count == 0)
        {
            await InitAttendanceForecastAsync(plan.PlanId, centerId, date);
        }

        return ApiResponse<DailyPlanSummaryDto>.Ok(await BuildSummaryAsync(plan.PlanId));
    }

    private async Task InitAttendanceForecastAsync(int planId, int centerId, DateOnly date)
    {
        var allElderly = await _context.ElderlyMembers
            .Include(e => e.ServiceRegistrations)
            .Where(e => e.IsActive)
            .ToListAsync();

        var dayOfWeek = date.DayOfWeek;
        var forecasts = new List<DailyAttendanceForecast>();

        foreach (var e in allElderly)
        {
            var status = ShouldAttend(e, date, dayOfWeek) ? "Expected" : "Absent";
            forecasts.Add(new DailyAttendanceForecast
            {
                PlanId = planId,
                ElderlyId = e.ElderlyId,
                AttendanceStatus = status,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (forecasts.Count > 0)
        {
            await _context.DailyAttendanceForecasts.AddRangeAsync(forecasts);
            await _context.SaveChangesAsync();
        }
    }

    private static bool ShouldAttend(ElderlyMember elderly, DateOnly date, DayOfWeek dow)
    {
        if (dow == DayOfWeek.Sunday) return false;
        if (!elderly.ServiceRegistrations.Any()) return true;

        var activeReg = elderly.ServiceRegistrations.FirstOrDefault(r =>
            r.Status == "Confirmed"
            && r.StartDate <= date
            && (r.EndDate == null || r.EndDate >= date));

        if (activeReg == null) return false;

        if (activeReg.RegistrationType?.Equals("daily", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (string.IsNullOrWhiteSpace(activeReg.SelectedDatesJson)) return false;
            try
            {
                var dates = JsonSerializer.Deserialize<List<string>>(activeReg.SelectedDatesJson);
                return dates?.Contains(date.ToString("yyyy-MM-dd")) == true;
            }
            catch { return false; }
        }

        var pattern = activeReg.MonthlyPattern?.ToLowerInvariant();
        return pattern switch
        {
            "mon_wed_fri" => dow is DayOfWeek.Monday or DayOfWeek.Wednesday or DayOfWeek.Friday,
            "tue_thu_sat" => dow is DayOfWeek.Tuesday or DayOfWeek.Thursday or DayOfWeek.Saturday,
            _ => dow != DayOfWeek.Sunday
        };
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 1: ATTENDANCE FORECAST
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<AttendanceForecastResultDto>> GetAttendanceForecastAsync(int planId)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts)
                .ThenInclude(f => f.Elderly)
                    .ThenInclude(e => e.ServiceRegistrations)
                        .ThenInclude(sr => sr.Package)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<AttendanceForecastResultDto>.Fail("Không tìm thấy kế hoạch.");

        return ApiResponse<AttendanceForecastResultDto>.Ok(BuildForecastResult(plan));
    }

    public async Task<ApiResponse<AttendanceForecastResultDto>> UpdateAttendanceAsync(int planId, UpdateAttendanceDto dto)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts)
                .ThenInclude(f => f.Elderly)
                    .ThenInclude(e => e.ServiceRegistrations)
                        .ThenInclude(sr => sr.Package)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<AttendanceForecastResultDto>.Fail("Không tìm thấy kế hoạch.");

        var forecast = plan.AttendanceForecasts.FirstOrDefault(f => f.ElderlyId == dto.ElderlyId);
        var normStatus = NormalizeStatus(dto.AttendanceStatus);

        if (forecast == null)
        {
            forecast = new DailyAttendanceForecast
            {
                PlanId = planId,
                ElderlyId = dto.ElderlyId,
                AttendanceStatus = normStatus,
                Reason = dto.Reason,
                CreatedAt = DateTime.UtcNow
            };
            await _context.DailyAttendanceForecasts.AddAsync(forecast);
        }
        else
        {
            forecast.AttendanceStatus = normStatus;
            forecast.Reason = dto.Reason;
            forecast.UpdatedAt = DateTime.UtcNow;
        }

        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<AttendanceForecastResultDto>.Ok(BuildForecastResult(plan));
    }

    public async Task<ApiResponse<AttendanceForecastResultDto>> BulkUpdateAttendanceAsync(int planId, BulkUpdateAttendanceDto dto)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts)
                .ThenInclude(f => f.Elderly)
                    .ThenInclude(e => e.ServiceRegistrations)
                        .ThenInclude(sr => sr.Package)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<AttendanceForecastResultDto>.Fail("Không tìm thấy kế hoạch.");

        foreach (var update in dto.Updates)
        {
            var forecast = plan.AttendanceForecasts.FirstOrDefault(f => f.ElderlyId == update.ElderlyId);
            var normStatus = NormalizeStatus(update.AttendanceStatus);
            if (forecast != null)
            {
                forecast.AttendanceStatus = normStatus;
                forecast.Reason = update.Reason;
                forecast.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                plan.AttendanceForecasts.Add(new DailyAttendanceForecast
                {
                    PlanId = planId,
                    ElderlyId = update.ElderlyId,
                    AttendanceStatus = normStatus,
                    Reason = update.Reason,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<AttendanceForecastResultDto>.Ok(BuildForecastResult(plan));
    }

    private static AttendanceForecastResultDto BuildForecastResult(DailySchedulePlan plan)
    {
        var items = plan.AttendanceForecasts.Select(f =>
        {
            var e = f.Elderly;
            var norm = NormalizeStatus(f.AttendanceStatus);
            var pkgName = e?.ServiceRegistrations.FirstOrDefault(r => r.Status == "Confirmed")?.Package?.PackageName ?? "Gói cơ bản";
            var grp = plan.CareGroups.FirstOrDefault(g => g.Members.Any(m => m.ElderlyId == f.ElderlyId));

            return new AttendanceForecastItemDto
            {
                ElderlyId = f.ElderlyId,
                MemberCode = $"ELD-{f.ElderlyId:D4}",
                FullName = e?.FullName ?? "—",
                MobilityStatus = e?.MobilityStatus ?? "Normal",
                Gender = e?.Gender,
                DateOfBirth = e?.DateOfBirth,
                ServicePackageName = pkgName,
                CareGroupName = grp?.GroupName,
                AttendanceStatus = norm,
                Reason = f.Reason
            };
        }).OrderBy(i => i.MobilityStatus).ThenBy(i => i.FullName).ToList();

        var expectedCount = items.Count(i => i.AttendanceStatus == "Expected");
        var absentCount = items.Count(i => i.AttendanceStatus == "Absent");
        var notConfirmedCount = items.Count(i => i.AttendanceStatus == "NotConfirmed");

        return new AttendanceForecastResultDto
        {
            PlanId = plan.PlanId,
            PlanDate = plan.PlanDate,
            PlanStatus = plan.Status,
            TotalExpected = expectedCount,
            TotalAbsent = absentCount,
            TotalNotConfirmed = notConfirmedCount,
            TotalNormal = items.Count(i => i.AttendanceStatus == "Expected" && i.MobilityStatus == "Normal"),
            TotalSupport = items.Count(i => i.AttendanceStatus == "Expected" && i.MobilityStatus == "Support"),
            Items = items
        };
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 2: GROUP ARRANGEMENT
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<GroupArrangementResultDto>> GetGroupArrangementAsync(int planId)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts)
                .ThenInclude(f => f.Elderly)
                    .ThenInclude(e => e.ServiceRegistrations)
                        .ThenInclude(sr => sr.Package)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
                    .ThenInclude(m => m.Elderly)
                        .ThenInclude(e => e.ServiceRegistrations)
                            .ThenInclude(sr => sr.Package)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Staff)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<GroupArrangementResultDto>.Fail("Không tìm thấy kế hoạch.");

        return ApiResponse<GroupArrangementResultDto>.Ok(BuildGroupArrangement(plan));
    }

    public async Task<ApiResponse<GroupArrangementResultDto>> CreateCareGroupAsync(int planId, CreateCareGroupDto dto)
    {
        var plan = await _context.DailySchedulePlans.FindAsync(planId);
        if (plan == null)
            return ApiResponse<GroupArrangementResultDto>.Fail("Không tìm thấy kế hoạch.");

        var groupType = dto.GroupType == "Support" ? "Support" : "Normal";
        var newGroup = new DailyCareGroup
        {
            PlanId = planId,
            GroupName = dto.GroupName.Trim(),
            GroupType = groupType,
            MaxNormalCapacity = groupType == "Normal" ? MaxNormalPerStaff : 0,
            MaxSupportCapacity = groupType == "Support" ? MaxSupportPerStaff : 0,
            CreatedAt = DateTime.UtcNow
        };

        await _context.DailyCareGroups.AddAsync(newGroup);
        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetGroupArrangementAsync(planId);
    }

    public async Task<ApiResponse<GroupArrangementResultDto>> DeleteCareGroupAsync(int planId, int groupId)
    {
        var group = await _context.DailyCareGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.GroupId == groupId && g.PlanId == planId);

        if (group == null)
            return ApiResponse<GroupArrangementResultDto>.Fail("Không tìm thấy nhóm cần xóa.");

        _context.CareGroupMembers.RemoveRange(group.Members);
        _context.DailyCareGroups.Remove(group);

        var assignments = await _context.StaffCareAssignments
            .Where(a => a.PlanId == planId && group.Members.Select(m => m.ElderlyId).Contains(a.ElderlyId))
            .ToListAsync();
        _context.StaffCareAssignments.RemoveRange(assignments);

        await _context.SaveChangesAsync();
        return await GetGroupArrangementAsync(planId);
    }

    public async Task<ApiResponse<GroupArrangementResultDto>> MoveElderlyToGroupAsync(int planId, MoveElderlyToGroupDto dto)
    {
        var targetGroup = await _context.DailyCareGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.GroupId == dto.TargetGroupId && g.PlanId == planId);

        if (targetGroup == null)
            return ApiResponse<GroupArrangementResultDto>.Fail("Không tìm thấy nhóm đích.");

        var elderly = await _context.ElderlyMembers.FindAsync(dto.ElderlyId);
        if (elderly == null)
            return ApiResponse<GroupArrangementResultDto>.Fail("Không tìm thấy người cao tuổi.");

        var isSupport = IsSupport(elderly);
        var expectedType = isSupport ? "Support" : "Normal";

        if (targetGroup.GroupType != expectedType)
            return ApiResponse<GroupArrangementResultDto>.Fail(
                $"Cụ {elderly.FullName} là nhóm {expectedType}, không thể chuyển vào nhóm {targetGroup.GroupType}.");

        var maxCap = isSupport ? MaxSupportPerStaff : MaxNormalPerStaff;
        if (targetGroup.Members.Count >= maxCap)
            return ApiResponse<GroupArrangementResultDto>.Fail(
                $"Nhóm {targetGroup.GroupName} đã đủ định mức tối đa ({targetGroup.Members.Count}/{maxCap}).");

        var oldMembers = await _context.CareGroupMembers
            .Include(m => m.Group)
            .Where(m => m.Group.PlanId == planId && m.ElderlyId == dto.ElderlyId)
            .ToListAsync();
        _context.CareGroupMembers.RemoveRange(oldMembers);

        targetGroup.Members.Add(new CareGroupMember
        {
            GroupId = targetGroup.GroupId,
            ElderlyId = dto.ElderlyId,
            AssignedAt = DateTime.UtcNow
        });

        if (targetGroup.StaffId.HasValue)
        {
            var assignment = await _context.StaffCareAssignments
                .FirstOrDefaultAsync(a => a.PlanId == planId && a.ElderlyId == dto.ElderlyId);
            if (assignment != null)
            {
                assignment.StaffId = targetGroup.StaffId.Value;
            }
            else
            {
                await _context.StaffCareAssignments.AddAsync(new StaffCareAssignment
                {
                    PlanId = planId,
                    StaffId = targetGroup.StaffId.Value,
                    ElderlyId = dto.ElderlyId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return await GetGroupArrangementAsync(planId);
    }

    private static GroupArrangementResultDto BuildGroupArrangement(DailySchedulePlan plan)
    {
        var assignedIds = plan.CareGroups.SelectMany(g => g.Members.Select(m => m.ElderlyId)).ToHashSet();
        var expectedElderly = plan.AttendanceForecasts
            .Where(f => NormalizeStatus(f.AttendanceStatus) == "Expected" && f.Elderly != null)
            .Select(f => f.Elderly!)
            .ToList();

        var normalGroups = plan.CareGroups
            .Where(g => g.GroupType == "Normal")
            .OrderBy(g => g.GroupName)
            .Select(MapGroupDetail)
            .ToList();

        var supportGroups = plan.CareGroups
            .Where(g => g.GroupType == "Support")
            .OrderBy(g => g.GroupName)
            .Select(MapGroupDetail)
            .ToList();

        var unassigned = expectedElderly
            .Where(e => !assignedIds.Contains(e.ElderlyId))
            .Select(e => new GroupMemberItemDto
            {
                ElderlyId = e.ElderlyId,
                MemberCode = $"ELD-{e.ElderlyId:D4}",
                FullName = e.FullName,
                MobilityStatus = e.MobilityStatus ?? "Normal",
                ServicePackageName = e.ServiceRegistrations.FirstOrDefault(r => r.Status == "Confirmed")?.Package?.PackageName ?? "Gói cơ bản"
            }).ToList();

        return new GroupArrangementResultDto
        {
            PlanId = plan.PlanId,
            NormalGroups = normalGroups,
            SupportGroups = supportGroups,
            Unassigned = unassigned
        };
    }

    private static CareGroupDetailDto MapGroupDetail(DailyCareGroup g) => new()
    {
        GroupId = g.GroupId,
        GroupName = g.GroupName,
        GroupType = g.GroupType,
        StaffId = g.StaffId,
        StaffName = g.Staff?.FullName,
        Members = g.Members.Select(m => new GroupMemberItemDto
        {
            ElderlyId = m.ElderlyId,
            MemberCode = $"ELD-{m.ElderlyId:D4}",
            FullName = m.Elderly?.FullName ?? "—",
            MobilityStatus = m.Elderly?.MobilityStatus ?? "Normal",
            ServicePackageName = m.Elderly?.ServiceRegistrations.FirstOrDefault(r => r.Status == "Confirmed")?.Package?.PackageName
        }).ToList()
    };

    // ════════════════════════════════════════════════════════════════════
    // STEP 3: STAFF AVAILABILITY
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<StaffAvailabilityResultDto>> GetStaffAvailabilityAsync(DateOnly date, int centerId)
    {
        var allStaff = await _context.Users
            .Include(u => u.Roles)
            .Include(u => u.StaffSchedules.Where(s => s.WorkDate == date))
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .ToListAsync();

        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts).ThenInclude(f => f.Elderly)
            .FirstOrDefaultAsync(p => p.PlanDate == date);

        var attending = plan?.AttendanceForecasts
            .Where(f => NormalizeStatus(f.AttendanceStatus) == "Expected" && f.Elderly != null)
            .ToList() ?? new();

        var normalCount = attending.Count(f => !IsSupport(f.Elderly));
        var supportCount = attending.Count(f => IsSupport(f.Elderly));
        var reqNormal = (int)Math.Ceiling((double)normalCount / MaxNormalPerStaff);
        var reqSupport = (int)Math.Ceiling((double)supportCount / MaxSupportPerStaff);

        var items = allStaff.Select(u =>
        {
            var schedule = u.StaffSchedules.FirstOrDefault(s => s.WorkDate == date);
            var avail = schedule?.Availability ?? (schedule != null && !schedule.IsWorking ? "Off" : "Working");
            return new StaffAvailabilityItemDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                Availability = avail,
                Note = schedule?.Note
            };
        }).OrderBy(s => s.Availability).ThenBy(s => s.FullName).ToList();

        var working = items.Count(i => i.Availability == "Working");
        return ApiResponse<StaffAvailabilityResultDto>.Ok(new StaffAvailabilityResultDto
        {
            Date = date,
            TotalWorking = working,
            TotalOff = items.Count(i => i.Availability == "Off"),
            TotalLeave = items.Count(i => i.Availability == "Leave"),
            RequiredNormalStaff = reqNormal,
            RequiredSupportStaff = reqSupport,
            HasEnoughStaff = working >= reqNormal + reqSupport,
            Staff = items
        });
    }

    public async Task<ApiResponse<StaffAvailabilityResultDto>> UpdateStaffAvailabilityAsync(DateOnly date, UpdateStaffAvailabilityDto dto, int centerId)
    {
        var schedule = await _context.StaffSchedules
            .FirstOrDefaultAsync(s => s.StaffId == dto.StaffId && s.WorkDate == date);

        if (schedule == null)
        {
            schedule = new StaffSchedule
            {
                StaffId = dto.StaffId,
                WorkDate = date,
                CreatedAt = DateTime.UtcNow
            };
            await _context.StaffSchedules.AddAsync(schedule);
        }

        schedule.Availability = dto.Availability;
        schedule.IsWorking = dto.Availability == "Working";
        schedule.Note = dto.Note;

        await _context.SaveChangesAsync();
        return await GetStaffAvailabilityAsync(date, centerId);
    }

    public async Task<ApiResponse<StaffAvailabilityResultDto>> BulkUpdateStaffAvailabilityAsync(DateOnly date, BulkUpdateStaffAvailabilityDto dto, int centerId)
    {
        foreach (var update in dto.Updates)
        {
            var schedule = await _context.StaffSchedules
                .FirstOrDefaultAsync(s => s.StaffId == update.StaffId && s.WorkDate == date);

            if (schedule == null)
            {
                schedule = new StaffSchedule
                {
                    StaffId = update.StaffId,
                    WorkDate = date,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.StaffSchedules.AddAsync(schedule);
            }

            schedule.Availability = update.Availability;
            schedule.IsWorking = update.Availability == "Working";
            schedule.Note = update.Note;
        }

        await _context.SaveChangesAsync();
        return await GetStaffAvailabilityAsync(date, centerId);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 4: STAFF ASSIGNMENT
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<DailySchedulePlanDto>> GenerateAssignmentAsync(int planId, int centerId)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts).ThenInclude(f => f.Elderly)
            .Include(p => p.CareGroups).ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy kế hoạch.");

        var date = plan.PlanDate;

        var attendingElderly = plan.AttendanceForecasts
            .Where(f => NormalizeStatus(f.AttendanceStatus) == "Expected" && f.Elderly != null)
            .Select(f => f.Elderly!)
            .ToList();

        if (attendingElderly.Count == 0)
            return ApiResponse<DailySchedulePlanDto>.Fail("Không có người cao tuổi nào dự kiến đến. Vui lòng cập nhật Attendance Forecast ở bước 1.");

        var workingStaff = await _context.Users
            .Include(u => u.Roles)
            .Include(u => u.StaffSchedules.Where(s => s.WorkDate == date))
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .ToListAsync();

        workingStaff = workingStaff.Where(u =>
        {
            var sch = u.StaffSchedules.FirstOrDefault(s => s.WorkDate == date);
            if (sch == null) return true;
            return sch.IsWorking && (sch.Availability == "Working" || string.IsNullOrEmpty(sch.Availability));
        }).ToList();

        if (workingStaff.Count == 0)
            return ApiResponse<DailySchedulePlanDto>.Fail("Không có nhân viên nào đi làm. Vui lòng cập nhật Staff Availability ở bước 3.");

        var normalElderly = attendingElderly.Where(e => !IsSupport(e)).ToList();
        var supportElderly = attendingElderly.Where(e => IsSupport(e)).ToList();

        var reqNormal = (int)Math.Ceiling((double)normalElderly.Count / MaxNormalPerStaff);
        var reqSupport = (int)Math.Ceiling((double)supportElderly.Count / MaxSupportPerStaff);
        var warnings = new List<string>();

        if (workingStaff.Count < reqNormal + reqSupport)
            warnings.Add($"Thiếu nhân viên: cần {reqNormal + reqSupport} người (Normal: {reqNormal}, Support: {reqSupport}), chỉ có {workingStaff.Count} nhân viên đi làm.");

        var oldGroups = await _context.DailyCareGroups
            .Include(g => g.Members)
            .Where(g => g.PlanId == planId)
            .ToListAsync();
        _context.CareGroupMembers.RemoveRange(oldGroups.SelectMany(g => g.Members));
        _context.DailyCareGroups.RemoveRange(oldGroups);

        var oldAssignments = await _context.StaffCareAssignments
            .Where(a => a.PlanId == planId).ToListAsync();
        _context.StaffCareAssignments.RemoveRange(oldAssignments);

        await _context.SaveChangesAsync();

        var staffQueue = new Queue<User>(workingStaff);
        var newGroups = new List<DailyCareGroup>();
        var newAssignments = new List<StaffCareAssignment>();

        // 1. Phân các nhóm Support (tối đa 4 người/nhóm)
        for (int i = 0; i < supportElderly.Count; i += MaxSupportPerStaff)
        {
            var groupNo = (i / MaxSupportPerStaff) + 1;
            var chunk = supportElderly.Skip(i).Take(MaxSupportPerStaff).ToList();
            var staff = staffQueue.Count > 0 ? staffQueue.Dequeue() : null;

            var group = new DailyCareGroup
            {
                PlanId = planId,
                GroupName = $"Nhóm Support {groupNo}",
                GroupType = "Support",
                StaffId = staff?.UserId,
                MaxNormalCapacity = 0,
                MaxSupportCapacity = MaxSupportPerStaff,
                CreatedAt = DateTime.UtcNow,
                Members = chunk.Select(e => new CareGroupMember
                {
                    ElderlyId = e.ElderlyId,
                    AssignedAt = DateTime.UtcNow
                }).ToList()
            };
            newGroups.Add(group);

            if (staff != null)
            {
                newAssignments.AddRange(chunk.Select(e => new StaffCareAssignment
                {
                    PlanId = planId,
                    StaffId = staff.UserId,
                    ElderlyId = e.ElderlyId,
                    CreatedAt = DateTime.UtcNow
                }));
            }
            else
            {
                warnings.Add($"Nhóm Support {groupNo} chưa có nhân viên phụ trách.");
            }
        }

        // 2. Phân các nhóm Normal (tối đa 10 người/nhóm)
        for (int i = 0; i < normalElderly.Count; i += MaxNormalPerStaff)
        {
            var groupNo = (i / MaxNormalPerStaff) + 1;
            var chunk = normalElderly.Skip(i).Take(MaxNormalPerStaff).ToList();
            var staff = staffQueue.Count > 0 ? staffQueue.Dequeue() : null;

            var group = new DailyCareGroup
            {
                PlanId = planId,
                GroupName = $"Nhóm Normal {groupNo}",
                GroupType = "Normal",
                StaffId = staff?.UserId,
                MaxNormalCapacity = MaxNormalPerStaff,
                MaxSupportCapacity = 0,
                CreatedAt = DateTime.UtcNow,
                Members = chunk.Select(e => new CareGroupMember
                {
                    ElderlyId = e.ElderlyId,
                    AssignedAt = DateTime.UtcNow
                }).ToList()
            };
            newGroups.Add(group);

            if (staff != null)
            {
                newAssignments.AddRange(chunk.Select(e => new StaffCareAssignment
                {
                    PlanId = planId,
                    StaffId = staff.UserId,
                    ElderlyId = e.ElderlyId,
                    CreatedAt = DateTime.UtcNow
                }));
            }
            else
            {
                warnings.Add($"Nhóm Normal {groupNo} chưa có nhân viên phụ trách.");
            }
        }

        plan.Status = "ReadyToReview";
        plan.TotalStaff = workingStaff.Count;
        plan.TotalElderly = attendingElderly.Count;
        plan.UpdatedAt = DateTime.UtcNow;
        if (warnings.Count > 0)
            plan.Notes = string.Join(" | ", warnings);

        await _context.DailyCareGroups.AddRangeAsync(newGroups);
        await _context.StaffCareAssignments.AddRangeAsync(newAssignments);
        await _context.SaveChangesAsync();

        plan = await _context.DailySchedulePlans
            .Include(p => p.ConfirmedByNavigation)
            .Include(p => p.CareGroups).ThenInclude(g => g.Staff)
            .Include(p => p.CareGroups).ThenInclude(g => g.Members).ThenInclude(m => m.Elderly)
            .Include(p => p.Assignments).ThenInclude(a => a.Staff)
            .Include(p => p.Assignments).ThenInclude(a => a.Elderly)
            .FirstAsync(p => p.PlanId == planId);

        return ApiResponse<DailySchedulePlanDto>.Ok(BuildFullPlanDto(plan, warnings));
    }

    public async Task<ApiResponse<DailySchedulePlanDto>> AssignStaffToGroupAsync(int planId, AssignStaffToGroupDto dto)
    {
        var group = await _context.DailyCareGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.GroupId == dto.GroupId && g.PlanId == planId);

        if (group == null)
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy nhóm.");

        if (dto.StaffId.HasValue)
        {
            var staff = await _context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.UserId == dto.StaffId.Value && u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"));

            if (staff == null)
                return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy nhân viên hoặc nhân viên không hoạt động.");

            // Kiểm tra staff này đã phụ trách nhóm nào khác chưa
            var anotherGroup = await _context.DailyCareGroups
                .FirstOrDefaultAsync(g => g.PlanId == planId && g.StaffId == dto.StaffId.Value && g.GroupId != dto.GroupId);

            if (anotherGroup != null)
                return ApiResponse<DailySchedulePlanDto>.Fail(
                    $"Nhân viên {staff.FullName} đã phụ trách nhóm {anotherGroup.GroupName}. Mỗi nhân viên chỉ phụ trách 1 nhóm.");

            group.StaffId = dto.StaffId.Value;

            // Đồng bộ StaffCareAssignments
            var existingAssignments = await _context.StaffCareAssignments
                .Where(a => a.PlanId == planId && group.Members.Select(m => m.ElderlyId).Contains(a.ElderlyId))
                .ToListAsync();

            foreach (var ea in existingAssignments)
                ea.StaffId = dto.StaffId.Value;

            var missingElderlyIds = group.Members.Select(m => m.ElderlyId).Except(existingAssignments.Select(ea => ea.ElderlyId));
            foreach (var meId in missingElderlyIds)
            {
                await _context.StaffCareAssignments.AddAsync(new StaffCareAssignment
                {
                    PlanId = planId,
                    StaffId = dto.StaffId.Value,
                    ElderlyId = meId,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        else
        {
            group.StaffId = null;
            var existingAssignments = await _context.StaffCareAssignments
                .Where(a => a.PlanId == planId && group.Members.Select(m => m.ElderlyId).Contains(a.ElderlyId))
                .ToListAsync();
            _context.StaffCareAssignments.RemoveRange(existingAssignments);
        }

        await _context.SaveChangesAsync();

        var plan = await _context.DailySchedulePlans
            .Include(p => p.ConfirmedByNavigation)
            .Include(p => p.CareGroups).ThenInclude(g => g.Staff)
            .Include(p => p.CareGroups).ThenInclude(g => g.Members).ThenInclude(m => m.Elderly)
            .Include(p => p.Assignments).ThenInclude(a => a.Staff)
            .Include(p => p.Assignments).ThenInclude(a => a.Elderly)
            .FirstAsync(p => p.PlanId == planId);

        return ApiResponse<DailySchedulePlanDto>.Ok(BuildFullPlanDto(plan, new()));
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 5: REVIEW & PUBLISH
    // ════════════════════════════════════════════════════════════════════

    public async Task<ApiResponse<DailyPlanSummaryDto>> GetPlanSummaryAsync(int planId)
    {
        var exists = await _context.DailySchedulePlans.AnyAsync(p => p.PlanId == planId);
        if (!exists)
            return ApiResponse<DailyPlanSummaryDto>.Fail("Không tìm thấy kế hoạch.");

        return ApiResponse<DailyPlanSummaryDto>.Ok(await BuildSummaryAsync(planId));
    }

    public async Task<ApiResponse<DailyPlanSummaryDto>> PublishPlanAsync(int planId, int userId)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.CareGroups).ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.PlanId == planId);

        if (plan == null)
            return ApiResponse<DailyPlanSummaryDto>.Fail("Không tìm thấy kế hoạch.");

        if (plan.Status == "Published")
            return ApiResponse<DailyPlanSummaryDto>.Fail("Kế hoạch này đã được công bố rồi.");

        if (!plan.CareGroups.Any())
            return ApiResponse<DailyPlanSummaryDto>.Fail("Kế hoạch chưa có phân công nhóm. Vui lòng thực hiện Generate Assignment ở bước 4.");

        plan.Status = "Published";
        plan.ConfirmedAt = DateTime.UtcNow;
        plan.ConfirmedBy = userId;
        plan.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ApiResponse<DailyPlanSummaryDto>.Ok(await BuildSummaryAsync(planId));
    }

    public async Task<ApiResponse<List<PlanHistoryItemDto>>> GetPlanHistoryAsync(int centerId)
    {
        var plans = await _context.DailySchedulePlans
            .Include(p => p.ConfirmedByNavigation)
            .Include(p => p.CareGroups)
            .OrderByDescending(p => p.PlanDate)
            .ThenByDescending(p => p.PlanId)
            .Take(60)
            .ToListAsync();

        var dtos = plans.Select(p => new PlanHistoryItemDto
        {
            PlanId = p.PlanId,
            PlanDate = p.PlanDate,
            Status = p.Status,
            TotalElderly = p.TotalElderly,
            TotalStaff = p.TotalStaff,
            TotalGroups = p.CareGroups?.Count ?? 0,
            ConfirmedAt = p.ConfirmedAt,
            ConfirmedByName = p.ConfirmedByNavigation?.FullName,
            CreatedAt = p.CreatedAt,
            Notes = p.Notes
        }).ToList();

        return ApiResponse<List<PlanHistoryItemDto>>.Ok(dtos, $"Tìm thấy {dtos.Count} kế hoạch trong lịch sử.");
    }

    // ════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════

    private async Task<DailyPlanSummaryDto> BuildSummaryAsync(int planId)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.AttendanceForecasts).ThenInclude(f => f.Elderly)
            .Include(p => p.CareGroups).ThenInclude(g => g.Members).ThenInclude(m => m.Elderly)
            .Include(p => p.CareGroups).ThenInclude(g => g.Staff)
            .Include(p => p.Assignments)
            .Include(p => p.ConfirmedByNavigation)
            .FirstAsync(p => p.PlanId == planId);

        var forecasts = plan.AttendanceForecasts.ToList();
        var expectedCount = forecasts.Count(f => NormalizeStatus(f.AttendanceStatus) == "Expected");
        var absentCount = forecasts.Count(f => NormalizeStatus(f.AttendanceStatus) == "Absent");
        var notConfirmedCount = forecasts.Count(f => NormalizeStatus(f.AttendanceStatus) == "NotConfirmed");

        var normalCount = forecasts.Count(f => NormalizeStatus(f.AttendanceStatus) == "Expected" && !IsSupport(f.Elderly));
        var supportCount = forecasts.Count(f => NormalizeStatus(f.AttendanceStatus) == "Expected" && IsSupport(f.Elderly));

        var reqNormal = (int)Math.Ceiling((double)normalCount / MaxNormalPerStaff);
        var reqSupport = (int)Math.Ceiling((double)supportCount / MaxSupportPerStaff);

        var staffSchedules = await _context.StaffSchedules
            .Where(s => s.WorkDate == plan.PlanDate)
            .ToListAsync();

        var allStaff = await _context.Users
            .Include(u => u.Roles)
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .ToListAsync();

        int workingCount = 0, offCount = 0, leaveCount = 0;
        foreach (var s in allStaff)
        {
            var sch = staffSchedules.FirstOrDefault(x => x.StaffId == s.UserId);
            var avail = sch?.Availability ?? (sch != null && !sch.IsWorking ? "Off" : "Working");
            if (avail == "Working") workingCount++;
            else if (avail == "Off") offCount++;
            else if (avail == "Leave") leaveCount++;
        }

        var assignedIds = plan.CareGroups.SelectMany(g => g.Members.Select(m => m.ElderlyId)).ToHashSet();
        var warnings = new List<string>();

        if (workingCount < reqNormal + reqSupport)
            warnings.Add($"Cần {reqNormal + reqSupport} nhân viên nhưng chỉ có {workingCount} đi làm.");
        if (expectedCount > 0 && !plan.CareGroups.Any())
            warnings.Add("Chưa tạo phân công nhóm. Hãy thực hiện bước 4.");
        var unassigned = expectedCount - assignedIds.Count;
        if (unassigned > 0)
            warnings.Add($"Còn {unassigned} người cao tuổi chưa được phân nhóm.");

        // 1. Attendance Summary
        var attendanceSummary = new AttendanceSummaryBlockDto
        {
            TotalExpected = expectedCount,
            TotalAbsent = absentCount,
            TotalNotConfirmed = notConfirmedCount,
            TotalNormal = normalCount,
            TotalSupport = supportCount
        };

        // 2. Group Summary
        var groupSummary = plan.CareGroups.Select(g => new GroupSummaryItemDto
        {
            GroupId = g.GroupId,
            GroupName = g.GroupName,
            GroupType = g.GroupType,
            CurrentCount = g.Members.Count,
            MaxCapacity = g.GroupType == "Support" ? MaxSupportPerStaff : MaxNormalPerStaff,
            StaffName = g.Staff?.FullName
        }).OrderBy(gs => gs.GroupType == "Support" ? 0 : 1).ThenBy(gs => gs.GroupName).ToList();

        // 3. Staff Summary
        var assignedStaffIds = plan.CareGroups.Where(g => g.StaffId.HasValue).Select(g => g.StaffId!.Value).Distinct().Count();
        var staffSummary = new StaffSummaryBlockDto
        {
            TotalWorking = workingCount,
            TotalOff = offCount,
            TotalLeave = leaveCount,
            TotalAssigned = assignedStaffIds
        };

        // 4. Assignment Summary
        var assignmentSummary = plan.CareGroups.Select(g => new StaffCareGroupDto
        {
            GroupId = g.GroupId,
            GroupName = g.GroupName,
            GroupType = g.GroupType,
            StaffId = g.StaffId,
            FullName = g.Staff?.FullName ?? "Chưa phân công",
            Email = g.Staff?.Email ?? "",
            PhoneNumber = g.Staff?.PhoneNumber,
            NormalElderlyCount = g.Members.Count(m => !IsSupport(m.Elderly)),
            NeedSupportElderlyCount = g.Members.Count(m => IsSupport(m.Elderly)),
            ElderlyList = g.Members.Select(m => new ElderlyInGroupDto
            {
                ElderlyId = m.ElderlyId,
                FullName = m.Elderly?.FullName ?? "—",
                DateOfBirth = m.Elderly?.DateOfBirth,
                Gender = m.Elderly?.Gender,
                MobilityStatus = IsSupport(m.Elderly) ? "Support" : "Normal",
                CareNotes = m.Elderly?.CareNotes,
                EmergencyContactName = m.Elderly?.EmergencyContactName,
                EmergencyContactPhone = m.Elderly?.EmergencyContactPhone,
                AssignmentId = m.GroupMemberId
            }).ToList()
        }).OrderBy(a => a.GroupType == "Support" ? 0 : 1).ThenBy(a => a.GroupName).ToList();

        return new DailyPlanSummaryDto
        {
            PlanId = plan.PlanId,
            PlanDate = plan.PlanDate,
            Status = plan.Status,
            TotalAttending = expectedCount,
            TotalNormal = normalCount,
            TotalSupport = supportCount,
            TotalWorkingStaff = workingCount,
            TotalGroups = plan.CareGroups.Count,
            TotalAssigned = assignedIds.Count,
            TotalUnassigned = Math.Max(0, unassigned),
            AttendanceSummary = attendanceSummary,
            GroupSummary = groupSummary,
            StaffSummary = staffSummary,
            AssignmentSummary = assignmentSummary,
            Warnings = warnings,
            PublishedAt = plan.ConfirmedAt,
            PublishedByName = plan.ConfirmedByNavigation?.FullName
        };
    }

    private static DailySchedulePlanDto BuildFullPlanDto(DailySchedulePlan plan, List<string> warnings)
    {
        var staffGroups = plan.CareGroups
            .OrderBy(g => g.GroupType == "Support" ? 0 : 1)
            .ThenBy(g => g.GroupName)
            .Select(g =>
            {
                var elderlyList = g.Members.Select(m => new ElderlyInGroupDto
                {
                    ElderlyId = m.ElderlyId,
                    FullName = m.Elderly?.FullName ?? "—",
                    DateOfBirth = m.Elderly?.DateOfBirth,
                    Gender = m.Elderly?.Gender,
                    MobilityStatus = IsSupport(m.Elderly) ? "Support" : "Normal",
                    CareNotes = m.Elderly?.CareNotes,
                    EmergencyContactName = m.Elderly?.EmergencyContactName,
                    EmergencyContactPhone = m.Elderly?.EmergencyContactPhone,
                    AssignmentId = m.GroupMemberId
                }).ToList();

                return new StaffCareGroupDto
                {
                    GroupId = g.GroupId,
                    GroupName = g.GroupName,
                    GroupType = g.GroupType,
                    StaffId = g.StaffId,
                    FullName = g.Staff?.FullName ?? "Chưa phân công",
                    Email = g.Staff?.Email ?? "",
                    PhoneNumber = g.Staff?.PhoneNumber,
                    NormalElderlyCount = elderlyList.Count(e => e.MobilityStatus == "Normal"),
                    NeedSupportElderlyCount = elderlyList.Count(e => e.MobilityStatus == "Support"),
                    ElderlyList = elderlyList
                };
            }).ToList();

        return new DailySchedulePlanDto
        {
            PlanId = plan.PlanId,
            PlanDate = plan.PlanDate,
            Status = plan.Status,
            TotalStaff = plan.TotalStaff,
            TotalElderly = plan.TotalElderly,
            TotalNormal = staffGroups.Sum(g => g.NormalElderlyCount),
            TotalNeedSupport = staffGroups.Sum(g => g.NeedSupportElderlyCount),
            Notes = plan.Notes,
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt,
            Groups = staffGroups,
            UnassignedElderly = new(),
            Warnings = warnings.Distinct().ToList()
        };
    }
}
