using System.Text.Json;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Attendance;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class AttendanceService : IAttendanceService
{
    private const string DuplicateMessage = "Người cao tuổi đã được điểm danh trong ngày hôm nay.";
    private const string NoValidRegistrationMessage =
        "Người cao tuổi không có đăng ký dịch vụ hợp lệ cho ngày hôm nay. Không thể check-in.";

    private readonly AppDbContext _context;

    public AttendanceService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AttendanceActionResult<CheckInResponseDto>> CheckInAsync(int userId, CheckInRequestDto request)
    {
        var user = await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailCheckIn(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailCheckIn(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var isStaff = HasRole(user, "Staff");

        var elderly = await _context.ElderlyMembers
            .FirstOrDefaultAsync(e => e.ElderlyId == request.ElderlyId);

        if (elderly == null)
        {
            return FailCheckIn(400, "Không tìm thấy người cao tuổi.");
        }

        // BR-32 / SR-41: chỉ nhân viên chăm sóc được điểm danh; gia đình chỉ xem
        if (!isStaff)
            return FailCheckIn(403, "Chỉ nhân viên chăm sóc mới được điểm danh vào.");

        if (!elderly.IsActive)
        {
            return FailCheckIn(400, "Hồ sơ người cao tuổi không còn hoạt động.");
        }

        var today = VietnamTime.Today;
        var now = VietnamTime.Now;

        var existed = await _context.AttendanceRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ElderlyId == request.ElderlyId && a.AttendanceDate == today);

        if (existed != null)
        {
            return ConflictCheckIn();
        }

        var registration = await FindValidRegistrationForDateAsync(request.ElderlyId, today);
        if (registration == null)
        {
            return FailCheckIn(400, NoValidRegistrationMessage);
        }

        var record = new AttendanceRecord
        {
            ElderlyId = request.ElderlyId,
            RegistrationId = registration.RegistrationId,
            AttendanceDate = today,
            Status = "Present",
            CheckInAt = now,
            CheckInTime = TimeOnly.FromDateTime(now),
            CheckedInBy = userId,
            CreatedAt = now
        };

        await _context.AttendanceRecords.AddAsync(record);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IsDuplicateAttendance(ex))
        {
            _context.ChangeTracker.Clear();
            return ConflictCheckIn();
        }

        await AuditLogWriter.WriteAsync(_context, userId, "CHECK_IN", nameof(AttendanceRecord), record.AttendanceId.ToString(), new
        {
            record.ElderlyId,
            record.RegistrationId,
            record.AttendanceDate
        });

        // WF-02 / SRS 3.6.1: báo gia đình khi cụ đến trung tâm
        await CareLogShared.NotifyFamilyAsync(_context, elderly.ElderlyId,
            $"{elderly.FullName} đã đến trung tâm",
            $"Điểm danh vào lúc {now:HH:mm} ngày {now:dd/MM/yyyy}.",
            "Attendance", nameof(AttendanceRecord), record.AttendanceId);
        await _context.SaveChangesAsync();

        return new AttendanceActionResult<CheckInResponseDto>
        {
            StatusCode = 200,
            Body = ApiResponse<CheckInResponseDto>.Ok(MapCheckIn(record), "Check-in thành công.")
        };
    }

    public async Task<AttendanceActionResult<CheckOutResponseDto>> CheckOutAsync(int userId, CheckOutRequestDto request)
    {
        var user = await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailCheckOut(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailCheckOut(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        // BR-32 / SR-41: chỉ nhân viên chăm sóc được điểm danh ra; gia đình chỉ xem
        if (!HasRole(user, "Staff"))
            return FailCheckOut(403, "Chỉ nhân viên chăm sóc mới được điểm danh ra.");

        var elderlyExists = await _context.ElderlyMembers
            .AsNoTracking()
            .AnyAsync(e => e.ElderlyId == request.ElderlyId);

        if (!elderlyExists)
        {
            return FailCheckOut(404, "Không tìm thấy người cao tuổi.");
        }

        var today = VietnamTime.Today;
        var now = VietnamTime.Now;

        var record = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.ElderlyId == request.ElderlyId && a.AttendanceDate == today);

        if (record == null || record.CheckInAt == null)
        {
            return FailCheckOut(400, "Người cao tuổi chưa được check-in trong ngày hôm nay. Không thể check-out.");
        }

        if (record.CheckOutAt != null)
        {
            return FailCheckOut(409, "Người cao tuổi đã được check-out trong ngày hôm nay.");
        }

        if (now < record.CheckInAt.Value)
        {
            return FailCheckOut(400, "Thời gian check-out không hợp lệ (phải sau hoặc bằng thời gian check-in).");
        }

        record.CheckOutAt = now;
        record.CheckOutTime = TimeOnly.FromDateTime(now);
        record.CheckedOutBy = userId;
        record.Status = "CheckedOut";

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "CHECK_OUT", nameof(AttendanceRecord), record.AttendanceId.ToString(), new
        {
            record.ElderlyId,
            record.AttendanceDate
        });

        // WF-02: báo gia đình khi cụ rời trung tâm
        var elderlyName = await _context.ElderlyMembers
            .Where(e => e.ElderlyId == record.ElderlyId)
            .Select(e => e.FullName)
            .FirstOrDefaultAsync() ?? "Người cao tuổi";
        await CareLogShared.NotifyFamilyAsync(_context, record.ElderlyId,
            $"{elderlyName} đã rời trung tâm",
            $"Điểm danh ra lúc {now:HH:mm} ngày {now:dd/MM/yyyy}.",
            "Attendance", nameof(AttendanceRecord), record.AttendanceId);
        await _context.SaveChangesAsync();

        return new AttendanceActionResult<CheckOutResponseDto>
        {
            StatusCode = 200,
            Body = ApiResponse<CheckOutResponseDto>.Ok(MapCheckOut(record), "Check-out thành công.")
        };
    }

    public async Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetListAsync(int userId, DateOnly? date)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailList(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailList(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var canViewAll = CanViewAllAttendance(user); // Staff + Manager (SRS 3.1.3: Manager = V)
        var familyElderlyIds = canViewAll ? null : await GetFamilyElderlyIdsAsync(userId);
        if (!canViewAll && familyElderlyIds == null) return FailList(403, "Tài khoản không có quyền xem điểm danh.");

        var targetDate = date ?? VietnamTime.Today;

        var items = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.AttendanceDate == targetDate && (canViewAll || familyElderlyIds!.Contains(a.ElderlyId)))
            .OrderBy(a => a.CheckInAt)
            .Select(a => new AttendanceListItemDto
            {
                AttendanceId = a.AttendanceId,
                ElderlyId = a.ElderlyId,
                ElderlyName = a.Elderly.FullName,
                AttendanceDate = a.AttendanceDate,
                CheckInAt = a.CheckInAt,
                CheckOutAt = a.CheckOutAt,
                Status = a.Status,
                CheckedInBy = a.CheckedInBy,
                CheckedOutBy = a.CheckedOutBy,
                RegistrationId = a.RegistrationId
            })
            .ToListAsync();

        return new AttendanceActionResult<List<AttendanceListItemDto>>
        {
            StatusCode = 200,
            Body = ApiResponse<List<AttendanceListItemDto>>.Ok(items, "Lấy danh sách điểm danh thành công.")
        };
    }

    public async Task<AttendanceActionResult<AttendanceDetailDto>> GetByIdAsync(int userId, int attendanceId)
    {
        if (attendanceId <= 0)
        {
            return FailDetail(400, "Mã điểm danh không hợp lệ.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailDetail(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailDetail(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var canViewAll = CanViewAllAttendance(user); // Staff + Manager (SRS 3.1.3: Manager = V)
        if (!canViewAll && !await IsFamilyLinkedAsync(userId, await _context.AttendanceRecords.Where(a => a.AttendanceId == attendanceId).Select(a => a.ElderlyId).FirstOrDefaultAsync()))
            return FailDetail(403, "Bạn không có quyền xem bản ghi điểm danh này.");

        var detail = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.AttendanceId == attendanceId)
            .Select(a => new AttendanceDetailDto
            {
                AttendanceId = a.AttendanceId,
                ElderlyId = a.ElderlyId,
                ElderlyName = a.Elderly.FullName,
                RegistrationId = a.RegistrationId,
                AttendanceDate = a.AttendanceDate,
                Status = a.Status,
                CheckInAt = a.CheckInAt,
                CheckOutAt = a.CheckOutAt,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,
                CheckedInBy = a.CheckedInBy,
                CheckedOutBy = a.CheckedOutBy,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UpdatedBy = a.UpdatedBy
            })
            .FirstOrDefaultAsync();

        if (detail == null)
        {
            return FailDetail(404, "Không tìm thấy bản ghi điểm danh.");
        }

        return new AttendanceActionResult<AttendanceDetailDto>
        {
            StatusCode = 200,
            Body = ApiResponse<AttendanceDetailDto>.Ok(detail, "Lấy chi tiết điểm danh thành công.")
        };
    }

    public async Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetHistoryByElderlyAsync(int userId, int elderlyId)
    {
        if (elderlyId <= 0)
        {
            return FailList(400, "Mã người cao tuổi không hợp lệ.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailList(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailList(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var canViewAll = CanViewAllAttendance(user); // Staff + Manager (SRS 3.1.3: Manager = V)
        if (!canViewAll && !await IsFamilyLinkedAsync(userId, elderlyId))
            return FailList(403, "Bạn không có quyền xem lịch sử người cao tuổi này.");

        var elderlyExists = await _context.ElderlyMembers
            .AsNoTracking()
            .AnyAsync(e => e.ElderlyId == elderlyId);

        if (!elderlyExists)
        {
            return FailList(404, "Không tìm thấy người cao tuổi.");
        }

        var items = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.ElderlyId == elderlyId)
            .OrderByDescending(a => a.AttendanceDate)
            .ThenByDescending(a => a.CheckInAt)
            .Select(a => new AttendanceListItemDto
            {
                AttendanceId = a.AttendanceId,
                ElderlyId = a.ElderlyId,
                ElderlyName = a.Elderly.FullName,
                AttendanceDate = a.AttendanceDate,
                CheckInAt = a.CheckInAt,
                CheckOutAt = a.CheckOutAt,
                Status = a.Status,
                CheckedInBy = a.CheckedInBy,
                CheckedOutBy = a.CheckedOutBy,
                RegistrationId = a.RegistrationId
            })
            .ToListAsync();

        return new AttendanceActionResult<List<AttendanceListItemDto>>
        {
            StatusCode = 200,
            Body = ApiResponse<List<AttendanceListItemDto>>.Ok(items, "Lấy lịch sử điểm danh thành công.")
        };
    }

    public async Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetPresentTodayAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailList(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailList(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var canViewAll = CanViewAllAttendance(user); // Staff + Manager (SRS 3.1.3: Manager = V)
        var familyElderlyIds = canViewAll ? null : await GetFamilyElderlyIdsAsync(userId);
        if (!canViewAll && familyElderlyIds == null) return FailList(403, "Tài khoản không có quyền xem điểm danh.");

        var today = VietnamTime.Today;

        var items = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.AttendanceDate == today
                     && a.CheckInAt != null
                     && a.CheckOutAt == null
                     && (canViewAll || familyElderlyIds!.Contains(a.ElderlyId)))
            .OrderBy(a => a.CheckInAt)
            .Select(a => new AttendanceListItemDto
            {
                AttendanceId = a.AttendanceId,
                ElderlyId = a.ElderlyId,
                ElderlyName = a.Elderly.FullName,
                AttendanceDate = a.AttendanceDate,
                CheckInAt = a.CheckInAt,
                CheckOutAt = a.CheckOutAt,
                Status = a.Status,
                CheckedInBy = a.CheckedInBy,
                CheckedOutBy = a.CheckedOutBy,
                RegistrationId = a.RegistrationId
            })
            .ToListAsync();

        return new AttendanceActionResult<List<AttendanceListItemDto>>
        {
            StatusCode = 200,
            Body = ApiResponse<List<AttendanceListItemDto>>.Ok(items, "Lấy danh sách người cao tuổi đang có mặt hôm nay thành công.")
        };
    }

    private async Task<ServiceRegistration?> FindValidRegistrationForDateAsync(int elderlyId, DateOnly date)
    {
        var candidates = await _context.ServiceRegistrations
            .AsNoTracking()
            .Where(r => r.ElderlyId == elderlyId
                     && r.Status == "Confirmed"
                     && r.StartDate <= date
                     && (r.EndDate == null || r.EndDate >= date))
            .OrderByDescending(r => r.StartDate)
            .ThenByDescending(r => r.RegistrationId)
            .ToListAsync();

        return candidates.FirstOrDefault(r => IsServiceDay(r, date));
    }

    private static bool IsServiceDay(ServiceRegistration registration, DateOnly date)
    {
        if (registration.RegistrationType.Equals("daily", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(registration.SelectedDatesJson)) return false;
            try
            {
                var dates = JsonSerializer.Deserialize<List<string>>(registration.SelectedDatesJson);
                return dates?.Contains(date.ToString("yyyy-MM-dd")) == true;
            }
            catch
            {
                return false;
            }
        }

        var dayOfWeek = date.DayOfWeek;
        return registration.MonthlyPattern?.ToLowerInvariant() switch
        {
            "mwf" or "mon_wed_fri" => dayOfWeek is DayOfWeek.Monday or DayOfWeek.Wednesday or DayOfWeek.Friday,
            "tts" or "tue_thu_sat" => dayOfWeek is DayOfWeek.Tuesday or DayOfWeek.Thursday or DayOfWeek.Saturday,
            _ => dayOfWeek != DayOfWeek.Sunday
        };
    }

    private static bool HasRole(User user, params string[] roleNames) =>
        user.Roles?.Any(r => roleNames.Contains(r.RoleName)) == true;

    /// <summary>
    /// Staff, Manager (role Center/CenterManager) và Admin xem được điểm danh của mọi cụ
    /// (Admin dùng chung dashboard Center như các API /api/center khác). Chỉ Staff được check-in/out.
    /// </summary>
    private static bool CanViewAllAttendance(User user) => HasRole(user, "Staff", "Center", "CenterManager", "Admin");

    private Task<bool> IsFamilyLinkedAsync(int userId, int elderlyId) =>
        _context.ElderlyFamilyRelationships.AnyAsync(r =>
            r.FamilyMember.UserId == userId && r.ElderlyId == elderlyId);

    private async Task<List<int>?> GetFamilyElderlyIdsAsync(int userId)
    {
        var familyMemberId = await _context.FamilyMembers
            .Where(f => f.UserId == userId)
            .Select(f => (int?)f.FamilyMemberId)
            .FirstOrDefaultAsync();

        if (!familyMemberId.HasValue) return null;

        return await _context.ElderlyFamilyRelationships
            .Where(r => r.FamilyMemberId == familyMemberId.Value)
            .Select(r => r.ElderlyId)
            .ToListAsync();
    }

    private static AttendanceActionResult<CheckInResponseDto> FailCheckIn(int statusCode, string message) => new()
    {
        StatusCode = statusCode,
        Body = ApiResponse<CheckInResponseDto>.Fail(message)
    };

    private static AttendanceActionResult<CheckInResponseDto> ConflictCheckIn() => new()
    {
        StatusCode = 409,
        Body = ApiResponse<CheckInResponseDto>.Fail(DuplicateMessage)
    };

    private static AttendanceActionResult<CheckOutResponseDto> FailCheckOut(int statusCode, string message) => new()
    {
        StatusCode = statusCode,
        Body = ApiResponse<CheckOutResponseDto>.Fail(message)
    };

    private static AttendanceActionResult<List<AttendanceListItemDto>> FailList(int statusCode, string message) => new()
    {
        StatusCode = statusCode,
        Body = ApiResponse<List<AttendanceListItemDto>>.Fail(message)
    };

    private static AttendanceActionResult<AttendanceDetailDto> FailDetail(int statusCode, string message) => new()
    {
        StatusCode = statusCode,
        Body = ApiResponse<AttendanceDetailDto>.Fail(message)
    };

    private static CheckInResponseDto MapCheckIn(AttendanceRecord record) => new()
    {
        AttendanceId = record.AttendanceId,
        ElderlyId = record.ElderlyId,
        AttendanceDate = record.AttendanceDate,
        CheckInAt = record.CheckInAt ?? default,
        Status = record.Status
    };

    private static CheckOutResponseDto MapCheckOut(AttendanceRecord record) => new()
    {
        AttendanceId = record.AttendanceId,
        ElderlyId = record.ElderlyId,
        AttendanceDate = record.AttendanceDate,
        CheckInAt = record.CheckInAt ?? default,
        CheckOutAt = record.CheckOutAt ?? default,
        Status = record.Status
    };

    private static bool IsDuplicateAttendance(DbUpdateException ex)
    {
        for (Exception? e = ex; e != null; e = e.InnerException)
        {
            var number = e.GetType().GetProperty("Number")?.GetValue(e);
            if (number is int n && (n == 2601 || n == 2627))
            {
                return true;
            }

            if (e.Message.Contains("UX_AttendanceRecords_Elderly_Date", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
