using System.Globalization;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Schedule;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// Quản lý lịch hoạt động mẫu theo gói (PackageActivities) — role Center / Admin.
/// Không xóa cứng: ẩn bằng IsActive để giữ liên kết với care log cũ.
/// </summary>
public class PackageActivityService : IPackageActivityService
{
    private readonly AppDbContext _context;

    public PackageActivityService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<PackageScheduleSummaryDto>>> GetPackagesAsync()
    {
        var packages = await _context.ServicePackages.AsNoTracking()
            .OrderBy(p => p.PackageId)
            .Select(p => new PackageScheduleSummaryDto
            {
                PackageId = p.PackageId,
                PackageName = p.PackageName,
                IsActive = p.IsActive,
                ActivityCount = p.PackageActivities.Count(a => a.IsActive),
            })
            .ToListAsync();
        return ApiResponse<List<PackageScheduleSummaryDto>>.Ok(packages, "Lấy danh sách gói thành công.");
    }

    public async Task<ApiResponse<List<PackageActivityDto>>> GetActivitiesAsync(int packageId, bool includeInactive)
    {
        if (!await _context.ServicePackages.AnyAsync(p => p.PackageId == packageId))
        {
            return ApiResponse<List<PackageActivityDto>>.Fail("Không tìm thấy gói dịch vụ.");
        }

        var activities = await _context.PackageActivities.AsNoTracking()
            .Where(a => a.PackageId == packageId && (includeInactive || a.IsActive))
            .OrderBy(a => a.StartTime).ThenBy(a => a.DayOfWeek).ThenBy(a => a.DisplayOrder)
            .ToListAsync();
        return ApiResponse<List<PackageActivityDto>>.Ok(activities.Select(ToDto).ToList(), "Lấy lịch hoạt động thành công.");
    }

    public async Task<ApiResponse<PackageActivityDto>> CreateAsync(int userId, int packageId, UpsertPackageActivityDto dto)
    {
        if (!await _context.ServicePackages.AnyAsync(p => p.PackageId == packageId))
        {
            return ApiResponse<PackageActivityDto>.Fail("Không tìm thấy gói dịch vụ.");
        }

        var (values, error) = Validate(dto);
        if (error != null)
        {
            return ApiResponse<PackageActivityDto>.Fail(error);
        }

        var maxOrder = await _context.PackageActivities.Where(a => a.PackageId == packageId)
            .Select(a => (int?)a.DisplayOrder).MaxAsync() ?? 0;
        var activity = new PackageActivity { PackageId = packageId, DisplayOrder = maxOrder + 1, IsActive = true };
        Apply(activity, dto, values!.Value);
        await _context.PackageActivities.AddAsync(activity);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "CREATE_PACKAGE_ACTIVITY", nameof(PackageActivity),
            activity.PackageActivityId.ToString(), new { packageId, dto.ActivityName, dto.DayOfWeek, dto.StartTime });

        return ApiResponse<PackageActivityDto>.Ok(ToDto(activity), "Đã thêm hoạt động vào lịch.");
    }

    public async Task<ApiResponse<PackageActivityDto>> UpdateAsync(int userId, int packageActivityId, UpsertPackageActivityDto dto)
    {
        var activity = await _context.PackageActivities.FirstOrDefaultAsync(a => a.PackageActivityId == packageActivityId);
        if (activity == null)
        {
            return ApiResponse<PackageActivityDto>.Fail("Không tìm thấy hoạt động.");
        }

        var (values, error) = Validate(dto);
        if (error != null)
        {
            return ApiResponse<PackageActivityDto>.Fail(error);
        }

        Apply(activity, dto, values!.Value);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "UPDATE_PACKAGE_ACTIVITY", nameof(PackageActivity),
            activity.PackageActivityId.ToString(), new { dto.ActivityName, dto.DayOfWeek, dto.StartTime, dto.EndTime });

        return ApiResponse<PackageActivityDto>.Ok(ToDto(activity), "Đã cập nhật hoạt động.");
    }

    public async Task<ApiResponse<PackageActivityDto>> SetActiveAsync(int userId, int packageActivityId, bool isActive)
    {
        var activity = await _context.PackageActivities.FirstOrDefaultAsync(a => a.PackageActivityId == packageActivityId);
        if (activity == null)
        {
            return ApiResponse<PackageActivityDto>.Fail("Không tìm thấy hoạt động.");
        }

        activity.IsActive = isActive;
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, isActive ? "SHOW_PACKAGE_ACTIVITY" : "HIDE_PACKAGE_ACTIVITY",
            nameof(PackageActivity), activity.PackageActivityId.ToString(), new { isActive });

        return ApiResponse<PackageActivityDto>.Ok(ToDto(activity), isActive ? "Đã hiện lại hoạt động." : "Đã ẩn hoạt động khỏi lịch.");
    }

    private readonly record struct Values(TimeOnly Start, TimeOnly End, string CareType, string Role, string? Condition);

    private static (Values? Values, string? Error) Validate(UpsertPackageActivityDto dto)
    {
        if (!TimeOnly.TryParseExact(dto.StartTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
            || !TimeOnly.TryParseExact(dto.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end))
        {
            return (null, "Giờ phải có dạng HH:mm.");
        }
        if (end <= start)
        {
            return (null, "Giờ kết thúc phải sau giờ bắt đầu.");
        }

        var careType = dto.CareType.Trim().ToUpperInvariant();
        if (!CareLogTypes.Schedulable.Contains(careType))
        {
            return (null, $"Loại care log chỉ nhận: {string.Join(", ", CareLogTypes.Schedulable)}.");
        }

        var role = PerformerRoles.All.FirstOrDefault(r => string.Equals(r, dto.PerformerRole?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (role == null)
        {
            return (null, "Người thực hiện chỉ nhận Nurse, Caregiver hoặc Any.");
        }

        string? condition = null;
        if (!string.IsNullOrWhiteSpace(dto.ConditionCode))
        {
            condition = dto.ConditionCode.Trim().ToUpperInvariant();
            if (!ChronicConditionCodes.All.Contains(condition))
            {
                return (null, $"Bệnh nền chỉ nhận: {string.Join(", ", ChronicConditionCodes.All)}.");
            }
        }

        return (new Values(start, end, careType, role, condition), null);
    }

    private static void Apply(PackageActivity activity, UpsertPackageActivityDto dto, Values values)
    {
        activity.DayOfWeek = dto.DayOfWeek is int day ? (byte)day : null;
        activity.StartTime = values.Start;
        activity.EndTime = values.End;
        activity.ActivityName = dto.ActivityName.Trim();
        activity.Purpose = string.IsNullOrWhiteSpace(dto.Purpose) ? null : dto.Purpose.Trim();
        activity.CareType = values.CareType;
        activity.TargetMinutes = dto.TargetMinutes;
        activity.PerformerRole = values.Role;
        activity.IsRequired = dto.IsRequired;
        activity.ConditionCode = values.Condition;
        activity.Source = string.IsNullOrWhiteSpace(dto.Source) ? null : dto.Source.Trim();
    }

    private static PackageActivityDto ToDto(PackageActivity a) => new()
    {
        PackageActivityId = a.PackageActivityId,
        PackageId = a.PackageId,
        DayOfWeek = a.DayOfWeek,
        StartTime = a.StartTime.ToString("HH:mm"),
        EndTime = a.EndTime.ToString("HH:mm"),
        ActivityName = a.ActivityName,
        Purpose = a.Purpose,
        CareType = a.CareType,
        TargetMinutes = a.TargetMinutes,
        PerformerRole = a.PerformerRole,
        IsRequired = a.IsRequired,
        ConditionCode = a.ConditionCode,
        Source = a.Source,
        DisplayOrder = a.DisplayOrder,
        IsActive = a.IsActive,
    };
}
