using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Medication;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class MedicationService : IMedicationService
{
    private const int DefaultGenerateDays = 14;
    private const int MaxGenerateDays = 60;

    private readonly AppDbContext _context;

    public MedicationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<MedicationPlanDto>> CreatePlanAsync(int userId, int elderlyId, CreateMedicationPlanDto dto)
    {
        var (_, elderly, error) = await GetStaffElderlyAsync(userId, elderlyId);
        if (error != null)
        {
            return ApiResponse<MedicationPlanDto>.Fail(error);
        }

        var (times, timeError) = MedicationSchedule.ParseTimes(dto.ScheduleTimes);
        if (timeError != null)
        {
            return ApiResponse<MedicationPlanDto>.Fail(timeError);
        }

        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
        {
            return ApiResponse<MedicationPlanDto>.Fail("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        var plan = new MedicationPlan
        {
            ElderlyId = elderly!.ElderlyId,
            MedicationName = dto.MedicationName.Trim(),
            Dosage = dto.Dosage.Trim(),
            Instructions = string.IsNullOrWhiteSpace(dto.Instructions) ? null : dto.Instructions.Trim(),
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive,
            CreatedAt = VietnamTime.Now
        };

        await _context.MedicationPlans.AddAsync(plan);
        await _context.SaveChangesAsync();

        var days = Math.Clamp(dto.GenerateDays ?? DefaultGenerateDays, 1, MaxGenerateDays);
        await GenerateForPlanAsync(plan, times!, dto.StartDate, ResolveGenerateTo(dto.StartDate, dto.EndDate, days));

        await AuditLogWriter.WriteAsync(_context, userId, "CREATE_MEDICATION_PLAN", nameof(MedicationPlan),
            plan.MedicationPlanId.ToString(), new
            {
                elderly.ElderlyId,
                plan.MedicationName,
                ScheduleTimes = MedicationSchedule.ToLabels(times!)
            });

        plan.Elderly = elderly;
        return ApiResponse<MedicationPlanDto>.Ok(await ToDtoAsync(plan), "Tạo kế hoạch thuốc thành công.");
    }

    public async Task<ApiResponse<List<MedicationPlanDto>>> GetPlansAsync(int userId, int elderlyId, bool? activeOnly)
    {
        var (_, elderly, error) = await GetStaffElderlyAsync(userId, elderlyId);
        if (error != null)
        {
            return ApiResponse<List<MedicationPlanDto>>.Fail(error);
        }

        var query = _context.MedicationPlans
            .Include(p => p.Elderly)
            .Where(p => p.ElderlyId == elderly!.ElderlyId);

        if (activeOnly == true)
        {
            query = query.Where(p => p.IsActive);
        }

        var plans = await query
            .OrderByDescending(p => p.IsActive)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();

        var result = new List<MedicationPlanDto>();
        foreach (var plan in plans)
        {
            result.Add(await ToDtoAsync(plan));
        }

        return ApiResponse<List<MedicationPlanDto>>.Ok(result, "Lấy danh sách kế hoạch thuốc thành công.");
    }

    public async Task<ApiResponse<MedicationPlanDto>> UpdatePlanAsync(int userId, int planId, UpdateMedicationPlanDto dto)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        var plan = await _context.MedicationPlans
            .Include(p => p.Elderly)
            .FirstOrDefaultAsync(p => p.MedicationPlanId == planId);
        if (plan == null)
        {
            return ApiResponse<MedicationPlanDto>.Fail("Không tìm thấy kế hoạch thuốc.");
        }

        var (staff, _, error) = await GetStaffElderlyAsync(userId, plan.ElderlyId);
        if (error != null)
        {
            return ApiResponse<MedicationPlanDto>.Fail(error);
        }

        if (dto.EndDate.HasValue && dto.EndDate.Value < dto.StartDate)
        {
            return ApiResponse<MedicationPlanDto>.Fail("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }

        List<TimeOnly>? times = null;
        if (dto.ScheduleTimes is { Count: > 0 })
        {
            var (parsed, timeError) = MedicationSchedule.ParseTimes(dto.ScheduleTimes);
            if (timeError != null)
            {
                return ApiResponse<MedicationPlanDto>.Fail(timeError);
            }
            times = parsed;
        }

        plan.MedicationName = dto.MedicationName.Trim();
        plan.Dosage = dto.Dosage.Trim();
        plan.Instructions = string.IsNullOrWhiteSpace(dto.Instructions) ? null : dto.Instructions.Trim();
        plan.StartDate = dto.StartDate;
        plan.EndDate = dto.EndDate;
        plan.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        if (plan.IsActive && times != null)
        {
            var from = dto.StartDate < VietnamTime.Today ? VietnamTime.Today : dto.StartDate;
            await GenerateForPlanAsync(plan, times, from, ResolveGenerateTo(from, dto.EndDate, DefaultGenerateDays));
        }

        await AuditLogWriter.WriteAsync(_context, staff!.UserId, "UPDATE_MEDICATION_PLAN", nameof(MedicationPlan),
            plan.MedicationPlanId.ToString(), new { plan.MedicationName, plan.IsActive });

        return ApiResponse<MedicationPlanDto>.Ok(await ToDtoAsync(plan), "Cập nhật kế hoạch thuốc thành công.");
    }

    public async Task<ApiResponse<GenerateDosesResultDto>> GenerateDosesAsync(int userId, int planId, GenerateDosesDto dto)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        var plan = await _context.MedicationPlans
            .Include(p => p.Elderly)
            .FirstOrDefaultAsync(p => p.MedicationPlanId == planId);
        if (plan == null)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail("Không tìm thấy kế hoạch thuốc.");
        }

        var (_, _, error) = await GetStaffElderlyAsync(userId, plan.ElderlyId);
        if (error != null)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail(error);
        }

        if (!plan.IsActive)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail("Kế hoạch thuốc đang tắt, không tạo liều mới.");
        }

        var (times, timeError) = MedicationSchedule.ParseTimes(dto.ScheduleTimes);
        if (timeError != null)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail(timeError);
        }

        var from = dto.From ?? (plan.StartDate < VietnamTime.Today ? VietnamTime.Today : plan.StartDate);
        if (from < plan.StartDate)
        {
            from = plan.StartDate;
        }

        var to = dto.To ?? ResolveGenerateTo(from, plan.EndDate, DefaultGenerateDays);
        if (plan.EndDate.HasValue && to > plan.EndDate.Value)
        {
            to = plan.EndDate.Value;
        }

        if (to < from)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail("Khoảng ngày tạo liều không hợp lệ.");
        }

        if ((to.DayNumber - from.DayNumber + 1) > MaxGenerateDays)
        {
            return ApiResponse<GenerateDosesResultDto>.Fail($"Chỉ tạo tối đa {MaxGenerateDays} ngày một lần.");
        }

        var (created, skipped) = await GenerateForPlanAsync(plan, times!, from, to);
        var labels = MedicationSchedule.ToLabels(times!);

        await AuditLogWriter.WriteAsync(_context, userId, "GENERATE_MEDICATION_DOSES", nameof(MedicationPlan),
            plan.MedicationPlanId.ToString(),
            new { From = from, To = to, ScheduleTimes = labels, Created = created, Skipped = skipped });

        return ApiResponse<GenerateDosesResultDto>.Ok(new GenerateDosesResultDto
        {
            MedicationPlanId = plan.MedicationPlanId,
            From = from,
            To = to,
            ScheduleTimes = labels,
            CreatedCount = created,
            SkippedExistingCount = skipped
        }, $"Đã tạo {created} liều mới (bỏ qua {skipped} liều đã có).");
    }

    private async Task<(int Created, int Skipped)> GenerateForPlanAsync(
        MedicationPlan plan, IReadOnlyList<TimeOnly> times, DateOnly from, DateOnly to)
    {
        var rangeFrom = VietnamTime.DayRange(from).From;
        var rangeTo = VietnamTime.DayRange(to).To;

        var existing = await _context.MedicationRecords
            .Where(r => r.MedicationPlanId == plan.MedicationPlanId
                     && r.ScheduledAt >= rangeFrom
                     && r.ScheduledAt < rangeTo)
            .Select(r => r.ScheduledAt)
            .ToListAsync();
        var existingSet = existing.ToHashSet();

        var toAdd = new List<MedicationRecord>();
        var skipped = 0;

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            if (date < plan.StartDate)
            {
                continue;
            }

            if (plan.EndDate.HasValue && date > plan.EndDate.Value)
            {
                continue;
            }

            foreach (var time in times)
            {
                var scheduledAt = date.ToDateTime(time);
                if (existingSet.Contains(scheduledAt))
                {
                    skipped++;
                    continue;
                }

                toAdd.Add(new MedicationRecord
                {
                    MedicationPlanId = plan.MedicationPlanId,
                    ScheduledAt = scheduledAt,
                    Status = DoseStatuses.Pending
                });
                existingSet.Add(scheduledAt);
            }
        }

        if (toAdd.Count > 0)
        {
            await _context.MedicationRecords.AddRangeAsync(toAdd);
            await _context.SaveChangesAsync();
        }

        return (toAdd.Count, skipped);
    }

    private static DateOnly ResolveGenerateTo(DateOnly from, DateOnly? endDate, int days)
    {
        var to = from.AddDays(Math.Clamp(days, 1, MaxGenerateDays) - 1);
        if (endDate.HasValue && to > endDate.Value)
        {
            to = endDate.Value;
        }
        return to;
    }

    private async Task<(User? Staff, ElderlyMember? Elderly, string? Error)> GetStaffElderlyAsync(int userId, int elderlyId)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        var staff = await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId && u.Roles.Any(r => r.RoleName == "Staff" || r.RoleName == "Admin"));
        if (staff == null)
        {
            return (null, null, "Tài khoản chưa có hồ sơ nhân viên.");
        }

        var elderly = await _context.ElderlyMembers
            .FirstOrDefaultAsync(e => e.ElderlyId == elderlyId && e.IsActive);
        if (elderly == null)
        {
            return (staff, null, "Không tìm thấy người cao tuổi.");
        }

        return (staff, elderly, null);
    }

    private async Task<MedicationPlanDto> ToDtoAsync(MedicationPlan plan)
    {
        var records = await _context.MedicationRecords
            .Where(r => r.MedicationPlanId == plan.MedicationPlanId)
            .Select(r => new { r.ScheduledAt, r.Status })
            .ToListAsync();

        return new MedicationPlanDto
        {
            MedicationPlanId = plan.MedicationPlanId,
            ElderlyId = plan.ElderlyId,
            ElderlyName = plan.Elderly?.FullName ?? string.Empty,
            MedicationName = plan.MedicationName,
            Dosage = plan.Dosage,
            Instructions = plan.Instructions,
            ScheduleTimes = MedicationSchedule.InferLabelsFromScheduledAts(records.Select(r => r.ScheduledAt)),
            StartDate = plan.StartDate,
            EndDate = plan.EndDate,
            IsActive = plan.IsActive,
            CreatedAt = plan.CreatedAt,
            PendingDoseCount = records.Count(r => r.Status == DoseStatuses.Pending)
        };
    }
}
