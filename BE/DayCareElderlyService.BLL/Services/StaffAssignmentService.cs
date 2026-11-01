using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class StaffAssignmentService : IStaffAssignmentService
{
    private readonly AppDbContext _context;

    // Định mức phân công theo yêu cầu nghiệp vụ:
    // 1 Staff quản lý tối đa 10 người bình thường và 4 người cần hỗ trợ
    public const int MaxNormalPerStaff = 10;
    public const int MaxNeedSupportPerStaff = 4;

    public StaffAssignmentService(AppDbContext context)
    {
        _context = context;
    }

    private static DateOnly GetVietnamToday()
    {
        return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
    }

    /// <summary>
    /// Kiểm tra người cao tuổi có cần hỗ trợ hay không dựa vào MobilityStatus ("Support" hoặc "Normal")
    /// </summary>
    private static bool IsNeedSupport(ElderlyMember elderly)
    {
        if (string.IsNullOrWhiteSpace(elderly.MobilityStatus)) return false;
        var status = elderly.MobilityStatus.Trim();
        return status.Equals("Support", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Cần hỗ trợ", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Need Support", StringComparison.OrdinalIgnoreCase)
            || status.Equals("Yếu", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Lấy danh sách người cao tuổi dự kiến có mặt tại trung tâm vào ngày chỉ định
    /// </summary>
    private async Task<List<ElderlyMember>> GetAttendingElderlyForDateAsync(int centerId, DateOnly targetDate)
    {
        var dayOfWeek = targetDate.DayOfWeek;

        // 1. Lấy tất cả người cao tuổi đang hoạt động thuộc trung tâm
        var allActiveElderly = await _context.ElderlyMembers
            .Include(e => e.ServiceRegistrations)
            .Where(e => e.CenterId == centerId && e.IsActive)
            .ToListAsync();

        if (allActiveElderly.Count == 0)
        {
            return new List<ElderlyMember>();
        }

        var attendingList = new List<ElderlyMember>();

        foreach (var elderly in allActiveElderly)
        {
            // Kiểm tra xem cụ có gói đăng ký còn hiệu lực vào ngày targetDate không
            var activeReg = elderly.ServiceRegistrations.FirstOrDefault(r =>
                r.Status == "Confirmed"
                && r.StartDate <= targetDate
                && (r.EndDate == null || r.EndDate >= targetDate));

            if (activeReg == null)
            {
                // Nếu chưa có đăng ký cụ thể trong DB (dữ liệu test / ban đầu), vẫn cho phép tham gia
                if (elderly.ServiceRegistrations.Count == 0)
                {
                    attendingList.Add(elderly);
                }
                continue;
            }

            // Nếu gói theo ngày (daily): kiểm tra ngày được chọn
            if (activeReg.RegistrationType.Equals("daily", StringComparison.OrdinalIgnoreCase))
            {
                var targetStr = targetDate.ToString("yyyy-MM-dd");
                var isSelected = false;

                if (!string.IsNullOrWhiteSpace(activeReg.SelectedDatesJson))
                {
                    try
                    {
                        var dates = JsonSerializer.Deserialize<List<string>>(activeReg.SelectedDatesJson);
                        if (dates != null && dates.Contains(targetStr))
                        {
                            isSelected = true;
                        }
                    }
                    catch
                    {
                        // Fallback
                    }
                }

                if (isSelected || activeReg.StartDate == targetDate)
                {
                    attendingList.Add(elderly);
                }
            }
            // Nếu gói tháng (monthly): kiểm tra lịch 3 buổi hay cả tuần
            else
            {
                var pattern = activeReg.MonthlyPattern?.ToLowerInvariant();
                if (pattern == "mon_wed_fri")
                {
                    if (dayOfWeek == DayOfWeek.Monday || dayOfWeek == DayOfWeek.Wednesday || dayOfWeek == DayOfWeek.Friday)
                    {
                        attendingList.Add(elderly);
                    }
                }
                else if (pattern == "tue_thu_sat")
                {
                    if (dayOfWeek == DayOfWeek.Tuesday || dayOfWeek == DayOfWeek.Thursday || dayOfWeek == DayOfWeek.Saturday)
                    {
                        attendingList.Add(elderly);
                    }
                }
                else
                {
                    // full_week: đi từ Thứ Hai đến Thứ Bảy (Chủ nhật trung tâm nghỉ)
                    if (dayOfWeek != DayOfWeek.Sunday)
                    {
                        attendingList.Add(elderly);
                    }
                }
            }
        }

        return attendingList;
    }

    /// <summary>
    /// Lấy danh sách nhân viên Staff đi làm vào ngày chỉ định (không nghỉ và không phải Chủ nhật)
    /// </summary>
    private async Task<List<User>> GetWorkingStaffForDateAsync(DateOnly targetDate)
    {
        if (targetDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return new List<User>();
        }

        var allStaff = await _context.Users
            .Include(u => u.Roles)
            .Include(u => u.StaffSchedules.Where(s => s.WorkDate == targetDate))
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .ToListAsync();

        var workingStaff = new List<User>();

        foreach (var staff in allStaff)
        {
            var schedule = staff.StaffSchedules.FirstOrDefault(s => s.WorkDate == targetDate);
            // Nếu có lịch báo nghỉ (IsWorking == false) thì bỏ qua
            if (schedule != null && !schedule.IsWorking)
            {
                continue;
            }
            // Mặc định đi làm
            workingStaff.Add(staff);
        }

        return workingStaff;
    }

    public async Task<ApiResponse<DailySchedulePlanDto>> AutoAssignScheduleAsync(int centerManagerUserId, AutoAssignScheduleRequestDto dto)
    {
        // 1. Xác định ngày cần chia lịch (mặc định ngày mai nếu không chọn)
        var today = GetVietnamToday();
        var targetDate = dto.TargetDate ?? today.AddDays(1);

        if (targetDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Chủ nhật trung tâm đóng cửa, không thể chia lịch chăm sóc.");
        }

        // 2. Lấy thông tin Center
        var center = await _context.Centers.FirstOrDefaultAsync(c => c.IsActive);
        if (center == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy thông tin trung tâm.");
        }

        // 3. Lấy danh sách Staff đi làm ngày hôm đó
        var workingStaff = await GetWorkingStaffForDateAsync(targetDate);
        if (workingStaff.Count == 0)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail($"Không có nhân viên nào đi làm vào ngày {targetDate:dd/MM/yyyy}. Vui lòng kiểm tra lại lịch nhân viên.");
        }

        // 4. Lấy danh sách người cao tuổi dự kiến có mặt
        var attendingElderly = await GetAttendingElderlyForDateAsync(center.CenterId, targetDate);
        if (attendingElderly.Count == 0)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail($"Không có người cao tuổi nào có lịch đến trung tâm vào ngày {targetDate:dd/MM/yyyy}.");
        }

        // 5. Phân loại người cao tuổi theo MobilityStatus
        var needSupportList = attendingElderly.Where(IsNeedSupport).ToList();
        var normalList = attendingElderly.Where(e => !IsNeedSupport(e)).ToList();

        var warnings = new List<string>();

        // 6. Tách biệt 2 loại nhóm: Support (tối đa 4 cụ/nhóm) và Normal (tối đa 10 cụ/nhóm)
        // Nếu số lượng vượt quá định mức, tự động sinh thêm nhóm mới
        var supportChunks = needSupportList
            .Select((e, idx) => new { Elderly = e, Index = idx })
            .GroupBy(x => x.Index / MaxNeedSupportPerStaff)
            .Select(g => g.Select(x => x.Elderly).ToList())
            .ToList();

        var normalChunks = normalList
            .Select((e, idx) => new { Elderly = e, Index = idx })
            .GroupBy(x => x.Index / MaxNormalPerStaff)
            .Select(g => g.Select(x => x.Elderly).ToList())
            .ToList();

        var totalGroupsNeeded = supportChunks.Count + normalChunks.Count;
        var totalStaffAvailable = workingStaff.Count;

        if (totalGroupsNeeded > totalStaffAvailable)
        {
            var shortage = totalGroupsNeeded - totalStaffAvailable;
            warnings.Add($"Cảnh báo: Cần tổng cộng {totalGroupsNeeded} nhân viên ({supportChunks.Count} nhóm Support + {normalChunks.Count} nhóm Normal), nhưng hiện chỉ có {totalStaffAvailable} nhân viên đi làm. Còn thiếu {shortage} nhân viên phụ trách.");
        }

        // 7. Gán nhân viên: Mỗi nhân viên chỉ phụ trách 1 nhóm duy nhất (hoặc Support, hoặc Normal)
        // Ưu tiên gán cho các nhóm Support trước (cần chăm sóc đặc biệt), sau đó gán cho nhóm Normal
        var staffIndex = 0;
        var groupPlans = new List<(string GroupType, string GroupName, User? Staff, List<ElderlyMember> ElderlyMembers, int MaxNormal, int MaxSupport)>();

        for (int i = 0; i < supportChunks.Count; i++)
        {
            User? staff = null;
            if (staffIndex < workingStaff.Count)
            {
                staff = workingStaff[staffIndex++];
            }

            var groupName = staff != null
                ? $"Nhóm Support {i + 1} ({staff.FullName})"
                : $"Nhóm Support {i + 1} (Chưa có nhân sự)";

            groupPlans.Add(("Support", groupName, staff, supportChunks[i], 0, MaxNeedSupportPerStaff));
        }

        for (int i = 0; i < normalChunks.Count; i++)
        {
            User? staff = null;
            if (staffIndex < workingStaff.Count)
            {
                staff = workingStaff[staffIndex++];
            }

            var groupName = staff != null
                ? $"Nhóm Normal {i + 1} ({staff.FullName})"
                : $"Nhóm Normal {i + 1} (Chưa có nhân sự)";

            groupPlans.Add(("Normal", groupName, staff, normalChunks[i], MaxNormalPerStaff, 0));
        }

        if (staffIndex < workingStaff.Count)
        {
            var extraStaff = workingStaff.Count - staffIndex;
            warnings.Add($"Có {extraStaff} nhân viên đi làm hôm nay chưa phân nhóm (có thể bố trí hỗ trợ hoặc dự phòng).");
        }

        // 8. Lưu hoặc cập nhật DailySchedulePlan vào Database
        var existingPlan = await _context.DailySchedulePlans
            .Include(p => p.Assignments)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(p => p.CenterId == center.CenterId && p.PlanDate == targetDate);

        DailySchedulePlan plan;
        if (existingPlan != null)
        {
            plan = existingPlan;
            // Xóa các phân công cũ của ngày này để chia mới lại
            _context.StaffCareAssignments.RemoveRange(plan.Assignments);
            _context.DailyCareGroups.RemoveRange(plan.CareGroups);

            plan.Status = "Draft"; // Đưa về Draft để Center xem lại
            plan.ConfirmedAt = null;
            plan.ConfirmedBy = null;
            plan.TotalStaff = groupPlans.Count(g => g.Staff != null);
            plan.TotalElderly = attendingElderly.Count;
            plan.Notes = dto.Notes?.Trim();
            plan.UpdatedAt = DateTime.UtcNow;
            _context.DailySchedulePlans.Update(plan);
        }
        else
        {
            plan = new DailySchedulePlan
            {
                CenterId = center.CenterId,
                PlanDate = targetDate,
                Status = "Draft",
                TotalStaff = groupPlans.Count(g => g.Staff != null),
                TotalElderly = attendingElderly.Count,
                Notes = dto.Notes?.Trim(),
                CreatedAt = DateTime.UtcNow
            };
            await _context.DailySchedulePlans.AddAsync(plan);
        }

        await _context.SaveChangesAsync();

        // 9. Tạo các bản ghi DailyCareGroups và CareGroupMembers để phân tách rõ 2 loại Group
        var newGroups = new List<DailyCareGroup>();
        var newAssignments = new List<StaffCareAssignment>();

        foreach (var gp in groupPlans)
        {
            var careGroup = new DailyCareGroup
            {
                PlanId = plan.PlanId,
                GroupName = gp.GroupName,
                GroupType = gp.GroupType,
                StaffId = gp.Staff?.UserId,
                MaxNormalCapacity = gp.MaxNormal,
                MaxSupportCapacity = gp.MaxSupport,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var elderly in gp.ElderlyMembers)
            {
                careGroup.Members.Add(new CareGroupMember
                {
                    GroupId = careGroup.GroupId,
                    ElderlyId = elderly.ElderlyId,
                    AssignedAt = DateTime.UtcNow
                });

                if (gp.Staff != null)
                {
                    newAssignments.Add(new StaffCareAssignment
                    {
                        PlanId = plan.PlanId,
                        StaffId = gp.Staff.UserId,
                        ElderlyId = elderly.ElderlyId,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            newGroups.Add(careGroup);
        }

        await _context.DailyCareGroups.AddRangeAsync(newGroups);
        await _context.StaffCareAssignments.AddRangeAsync(newAssignments);
        await _context.SaveChangesAsync();

        // 9. Xây dựng kết quả trả về
        return await GetSchedulePlanAsync(targetDate, warnings);
    }

    public async Task<ApiResponse<DailySchedulePlanDto>> GetSchedulePlanAsync(DateOnly date)
    {
        return await GetSchedulePlanAsync(date, new List<string>());
    }

    private async Task<ApiResponse<DailySchedulePlanDto>> GetSchedulePlanAsync(DateOnly date, List<string> customWarnings)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.ConfirmedByNavigation)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Staff)
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
                    .ThenInclude(m => m.Elderly)
            .Include(p => p.Assignments)
                .ThenInclude(a => a.Staff)
            .Include(p => p.Assignments)
                .ThenInclude(a => a.Elderly)
            .FirstOrDefaultAsync(p => p.PlanDate == date);

        if (plan == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail($"Chưa có kế hoạch chia lịch cho ngày {date:dd/MM/yyyy}.");
        }

        var warnings = new List<string>(customWarnings);

        // Nhóm các assignments theo Group / Staff
        var staffGroups = new List<StaffCareGroupDto>();

        if (plan.CareGroups.Count > 0)
        {
            var sortedGroups = plan.CareGroups
                .OrderBy(g => g.GroupType == "Support" ? 0 : 1)
                .ThenBy(g => g.GroupName)
                .ToList();

            foreach (var g in sortedGroups)
            {
                var staff = g.Staff;
                var elderlyInGroup = g.Members.Select(m => new ElderlyInGroupDto
                {
                    ElderlyId = m.ElderlyId,
                    FullName = m.Elderly.FullName,
                    DateOfBirth = m.Elderly.DateOfBirth,
                    Gender = m.Elderly.Gender,
                    MobilityStatus = IsNeedSupport(m.Elderly) ? "Support" : "Normal",
                    CareNotes = m.Elderly.CareNotes,
                    EmergencyContactName = m.Elderly.EmergencyContactName,
                    EmergencyContactPhone = m.Elderly.EmergencyContactPhone,
                    AssignmentId = m.GroupMemberId,
                    AssignmentNotes = m.Notes
                }).ToList();

                var normalCount = elderlyInGroup.Count(e => e.MobilityStatus == "Normal");
                var needSupportCount = elderlyInGroup.Count(e => e.MobilityStatus == "Support");
                var groupType = g.GroupType ?? (g.MaxSupportCapacity > 0 ? "Support" : "Normal");

                if (groupType == "Support" && needSupportCount > MaxNeedSupportPerStaff)
                {
                    warnings.Add($"Nhóm {g.GroupName} đang có {needSupportCount} cụ Support (vượt quá định mức {MaxNeedSupportPerStaff}).");
                }
                else if (groupType == "Normal" && normalCount > MaxNormalPerStaff)
                {
                    warnings.Add($"Nhóm {g.GroupName} đang có {normalCount} cụ Normal (vượt quá định mức {MaxNormalPerStaff}).");
                }

                if (g.StaffId == null)
                {
                    warnings.Add($"Nhóm {g.GroupName} ({groupType}) hiện chưa có nhân sự phụ trách.");
                }

                staffGroups.Add(new StaffCareGroupDto
                {
                    GroupId = g.GroupId,
                    GroupName = g.GroupName,
                    GroupType = groupType,
                    StaffId = staff?.UserId,
                    FullName = staff?.FullName ?? "Chưa phân công Staff",
                    Email = staff?.Email ?? "",
                    PhoneNumber = staff?.PhoneNumber,
                    NormalElderlyCount = normalCount,
                    NeedSupportElderlyCount = needSupportCount,
                    ElderlyList = elderlyInGroup
                });
            }
        }
        else
        {
            // Fallback nếu plan tạo trước khi có CareGroups
            staffGroups = plan.Assignments
                .GroupBy(a => a.StaffId)
                .Select(g =>
                {
                    var staff = g.First().Staff;
                    var elderlyInGroup = g.Select(a => new ElderlyInGroupDto
                    {
                        ElderlyId = a.ElderlyId,
                        FullName = a.Elderly.FullName,
                        DateOfBirth = a.Elderly.DateOfBirth,
                        Gender = a.Elderly.Gender,
                        MobilityStatus = IsNeedSupport(a.Elderly) ? "Support" : "Normal",
                        CareNotes = a.Elderly.CareNotes,
                        EmergencyContactName = a.Elderly.EmergencyContactName,
                        EmergencyContactPhone = a.Elderly.EmergencyContactPhone,
                        AssignmentId = a.AssignmentId,
                        AssignmentNotes = a.Notes
                    }).ToList();

                    var normalCount = elderlyInGroup.Count(e => e.MobilityStatus == "Normal");
                    var needSupportCount = elderlyInGroup.Count(e => e.MobilityStatus == "Support");

                    return new StaffCareGroupDto
                    {
                        StaffId = staff.UserId,
                        FullName = staff.FullName,
                        Email = staff.Email,
                        PhoneNumber = staff.PhoneNumber,
                        NormalElderlyCount = normalCount,
                        NeedSupportElderlyCount = needSupportCount,
                        ElderlyList = elderlyInGroup
                    };
                }).ToList();
        }

        // Kiểm tra xem có người cao tuổi nào tham gia ngày này mà chưa được gán không
        var center = await _context.Centers.FirstOrDefaultAsync(c => c.IsActive);
        var unassignedDtos = new List<ElderlyInGroupDto>();

        if (center != null)
        {
            var assignedElderlyIds = plan.CareGroups.Count > 0
                ? plan.CareGroups.SelectMany(g => g.Members.Select(m => m.ElderlyId)).ToHashSet()
                : plan.Assignments.Select(a => a.ElderlyId).ToHashSet();
            var attending = await GetAttendingElderlyForDateAsync(center.CenterId, date);
            var unassigned = attending.Where(e => !assignedElderlyIds.Contains(e.ElderlyId)).ToList();

            unassignedDtos = unassigned.Select(e => new ElderlyInGroupDto
            {
                ElderlyId = e.ElderlyId,
                FullName = e.FullName,
                DateOfBirth = e.DateOfBirth,
                Gender = e.Gender,
                MobilityStatus = e.MobilityStatus ?? "Normal",
                CareNotes = e.CareNotes,
                EmergencyContactName = e.EmergencyContactName,
                EmergencyContactPhone = e.EmergencyContactPhone
            }).ToList();
        }

        var totalNormal = staffGroups.Sum(g => g.NormalElderlyCount);
        var totalNeedSupport = staffGroups.Sum(g => g.NeedSupportElderlyCount);

        var resultDto = new DailySchedulePlanDto
        {
            PlanId = plan.PlanId,
            CenterId = plan.CenterId,
            PlanDate = plan.PlanDate,
            Status = plan.Status,
            ConfirmedAt = plan.ConfirmedAt,
            ConfirmedByName = plan.ConfirmedByNavigation?.FullName,
            TotalStaff = staffGroups.Count(g => g.StaffId != null),
            TotalElderly = plan.CareGroups.Count > 0 
                ? plan.CareGroups.Sum(g => g.Members.Count) 
                : plan.Assignments.Count,
            TotalNormal = totalNormal,
            TotalNeedSupport = totalNeedSupport,
            Notes = plan.Notes,
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt,
            Groups = staffGroups,
            UnassignedElderly = unassignedDtos,
            Warnings = warnings.Distinct().ToList()
        };

        return ApiResponse<DailySchedulePlanDto>.Ok(resultDto);
    }

    public async Task<ApiResponse<DailySchedulePlanDto>> ReassignElderlyAsync(int centerManagerUserId, ReassignElderlyDto dto)
    {
        // 1. Kiểm tra Plan
        var plan = await _context.DailySchedulePlans.FindAsync(dto.PlanId);
        if (plan == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy kế hoạch chia lịch.");
        }

        // 2. Kiểm tra Staff mới
        var newStaff = await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == dto.NewStaffId && u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"));

        if (newStaff == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy nhân viên mới hoặc nhân viên không hoạt động.");
        }

        var elderly = await _context.ElderlyMembers.FindAsync(dto.ElderlyId);
        if (elderly == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy thông tin người cao tuổi.");
        }

        var isSupport = IsNeedSupport(elderly);
        var elderlyGroupType = isSupport ? "Support" : "Normal";
        var maxCap = isSupport ? MaxNeedSupportPerStaff : MaxNormalPerStaff;

        // Kiểm tra nhóm của staff tiếp nhận
        var targetGroup = await _context.DailyCareGroups
            .Include(g => g.Members)
            .FirstOrDefaultAsync(g => g.PlanId == dto.PlanId && g.StaffId == dto.NewStaffId);

        if (targetGroup != null)
        {
            if (targetGroup.GroupType != elderlyGroupType)
            {
                return ApiResponse<DailySchedulePlanDto>.Fail(
                    $"Nhân viên {newStaff.FullName} đang quản lý {targetGroup.GroupName} (loại {targetGroup.GroupType}), không thể tiếp nhận cụ {elderly.FullName} thuộc nhóm {elderlyGroupType}. Mỗi nhân viên chỉ phụ trách riêng một loại nhóm.");
            }

            if (targetGroup.Members.Count >= maxCap)
            {
                return ApiResponse<DailySchedulePlanDto>.Fail(
                    $"Nhóm {targetGroup.GroupName} đã đạt tối đa định mức ({targetGroup.Members.Count}/{maxCap} cụ {elderlyGroupType}). Không thể tiếp nhận thêm.");
            }
        }

        // 3. Cập nhật StaffCareAssignment
        var assignment = await _context.StaffCareAssignments
            .FirstOrDefaultAsync(a => a.PlanId == dto.PlanId && a.ElderlyId == dto.ElderlyId);

        if (assignment != null)
        {
            assignment.StaffId = dto.NewStaffId;
            if (!string.IsNullOrWhiteSpace(dto.Notes))
            {
                assignment.Notes = dto.Notes.Trim();
            }
            _context.StaffCareAssignments.Update(assignment);
        }
        else
        {
            // Nếu cụ này chưa được gán trong plan, tạo mới assignment
            assignment = new StaffCareAssignment
            {
                PlanId = dto.PlanId,
                StaffId = dto.NewStaffId,
                ElderlyId = dto.ElderlyId,
                Notes = dto.Notes?.Trim(),
                CreatedAt = DateTime.UtcNow
            };
            await _context.StaffCareAssignments.AddAsync(assignment);
        }

        // 4. Cập nhật DailyCareGroups và CareGroupMembers
        if (targetGroup == null)
        {
            targetGroup = new DailyCareGroup
            {
                PlanId = dto.PlanId,
                GroupName = $"Nhóm {elderlyGroupType} ({newStaff.FullName})",
                GroupType = elderlyGroupType,
                StaffId = dto.NewStaffId,
                MaxNormalCapacity = isSupport ? 0 : MaxNormalPerStaff,
                MaxSupportCapacity = isSupport ? MaxNeedSupportPerStaff : 0,
                CreatedAt = DateTime.UtcNow
            };
            await _context.DailyCareGroups.AddAsync(targetGroup);
            await _context.SaveChangesAsync();
        }

        // Xóa cụ khỏi các nhóm cũ trong plan này
        var oldGroupMembers = await _context.CareGroupMembers
            .Include(m => m.Group)
            .Where(m => m.Group.PlanId == dto.PlanId && m.ElderlyId == dto.ElderlyId)
            .ToListAsync();
        _context.CareGroupMembers.RemoveRange(oldGroupMembers);

        // Thêm vào nhóm mới của staff
        targetGroup.Members.Add(new CareGroupMember
        {
            GroupId = targetGroup.GroupId,
            ElderlyId = dto.ElderlyId,
            Notes = dto.Notes?.Trim(),
            AssignedAt = DateTime.UtcNow
        });

        plan.UpdatedAt = DateTime.UtcNow;
        _context.DailySchedulePlans.Update(plan);
        await _context.SaveChangesAsync();

        return await GetSchedulePlanAsync(plan.PlanDate);
    }

    public async Task<ApiResponse<DailySchedulePlanDto>> ConfirmScheduleAsync(int centerManagerUserId, ConfirmScheduleDto dto)
    {
        var plan = await _context.DailySchedulePlans
            .Include(p => p.Assignments)
            .FirstOrDefaultAsync(p => p.PlanId == dto.PlanId);

        if (plan == null)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Không tìm thấy kế hoạch chia lịch cần xác nhận.");
        }

        if (plan.Assignments.Count == 0)
        {
            return ApiResponse<DailySchedulePlanDto>.Fail("Kế hoạch này chưa có phân công nào, không thể xác nhận.");
        }

        plan.Status = "Confirmed";
        plan.ConfirmedAt = DateTime.UtcNow;
        plan.ConfirmedBy = centerManagerUserId;
        if (!string.IsNullOrWhiteSpace(dto.Notes))
        {
            plan.Notes = dto.Notes.Trim();
        }
        plan.UpdatedAt = DateTime.UtcNow;

        _context.DailySchedulePlans.Update(plan);
        await _context.SaveChangesAsync();

        return await GetSchedulePlanAsync(plan.PlanDate);
    }

    public async Task<ApiResponse<StaffCareGroupDto>> GetMyCareGroupAsync(int staffUserId, DateOnly date)
    {
        var staff = await _context.Users.FindAsync(staffUserId);
        if (staff == null)
        {
            return ApiResponse<StaffCareGroupDto>.Fail("Không tìm thấy thông tin nhân viên.");
        }

        // Tìm plan của ngày đó
        var plan = await _context.DailySchedulePlans
            .Include(p => p.CareGroups)
                .ThenInclude(g => g.Members)
                    .ThenInclude(m => m.Elderly)
            .Include(p => p.Assignments)
                .ThenInclude(a => a.Elderly)
            .FirstOrDefaultAsync(p => p.PlanDate == date);

        if (plan == null)
        {
            return ApiResponse<StaffCareGroupDto>.Fail($"Chưa có lịch phân công chăm sóc cho ngày {date:dd/MM/yyyy}.");
        }

        // Lấy nhóm và danh sách người già được gán cho staff này
        var careGroup = plan.CareGroups.FirstOrDefault(g => g.StaffId == staffUserId);
        var elderlyInGroup = new List<ElderlyInGroupDto>();

        if (careGroup != null && careGroup.Members.Count > 0)
        {
            elderlyInGroup = careGroup.Members.Select(m => new ElderlyInGroupDto
            {
                ElderlyId = m.ElderlyId,
                FullName = m.Elderly.FullName,
                DateOfBirth = m.Elderly.DateOfBirth,
                Gender = m.Elderly.Gender,
                MobilityStatus = IsNeedSupport(m.Elderly) ? "Support" : "Normal",
                CareNotes = m.Elderly.CareNotes,
                EmergencyContactName = m.Elderly.EmergencyContactName,
                EmergencyContactPhone = m.Elderly.EmergencyContactPhone,
                AssignmentId = m.GroupMemberId,
                AssignmentNotes = m.Notes
            }).ToList();
        }
        else
        {
            var myAssignments = plan.Assignments
                .Where(a => a.StaffId == staffUserId)
                .ToList();

            elderlyInGroup = myAssignments.Select(a => new ElderlyInGroupDto
            {
                ElderlyId = a.ElderlyId,
                FullName = a.Elderly.FullName,
                DateOfBirth = a.Elderly.DateOfBirth,
                Gender = a.Elderly.Gender,
                MobilityStatus = IsNeedSupport(a.Elderly) ? "Support" : "Normal",
                CareNotes = a.Elderly.CareNotes,
                EmergencyContactName = a.Elderly.EmergencyContactName,
                EmergencyContactPhone = a.Elderly.EmergencyContactPhone,
                AssignmentId = a.AssignmentId,
                AssignmentNotes = a.Notes
            }).ToList();
        }

        var normalCount = elderlyInGroup.Count(e => e.MobilityStatus == "Normal");
        var needSupportCount = elderlyInGroup.Count(e => e.MobilityStatus == "Support");

        var groupDto = new StaffCareGroupDto
        {
            GroupId = careGroup?.GroupId,
            GroupName = careGroup?.GroupName ?? $"Nhóm chăm sóc của {staff.FullName}",
            GroupType = careGroup?.GroupType ?? (needSupportCount > 0 ? "Support" : "Normal"),
            StaffId = staff.UserId,
            FullName = staff.FullName,
            Email = staff.Email,
            PhoneNumber = staff.PhoneNumber,
            NormalElderlyCount = normalCount,
            NeedSupportElderlyCount = needSupportCount,
            ElderlyList = elderlyInGroup
        };

        return ApiResponse<StaffCareGroupDto>.Ok(groupDto);
    }
}

