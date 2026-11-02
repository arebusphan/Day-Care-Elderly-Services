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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailCheckIn(403, "Bạn không có quyền điểm danh người cao tuổi.");
        }

        var elderly = await _context.ElderlyMembers
            .FirstOrDefaultAsync(e => e.ElderlyId == request.ElderlyId);

        if (elderly == null)
        {
            return FailCheckIn(400, "Không tìm thấy người cao tuổi.");
        }

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
            CreatedAt = now,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailCheckOut(403, "Bạn không có quyền điểm danh người cao tuổi.");
        }

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
        MergeNotes(record, request.Notes);

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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailList(403, "Bạn không có quyền xem danh sách điểm danh.");
        }

        var targetDate = date ?? VietnamTime.Today;

        var items = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.AttendanceDate == targetDate)
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
                RegistrationId = a.RegistrationId,
                Notes = a.Notes
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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailDetail(403, "Bạn không có quyền xem chi tiết điểm danh.");
        }

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
                Notes = a.Notes,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                UpdatedBy = a.UpdatedBy,
                CorrectionReason = a.CorrectionReason
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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailList(403, "Bạn không có quyền xem lịch sử điểm danh.");
        }

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
                RegistrationId = a.RegistrationId,
                Notes = a.Notes
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

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailList(403, "Bạn không có quyền xem danh sách người cao tuổi đang có mặt.");
        }

        var today = VietnamTime.Today;

        var items = await _context.AttendanceRecords
            .AsNoTracking()
            .Where(a => a.AttendanceDate == today
                     && a.CheckInAt != null
                     && a.CheckOutAt == null)
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
                RegistrationId = a.RegistrationId,
                Notes = a.Notes
            })
            .ToListAsync();

        return new AttendanceActionResult<List<AttendanceListItemDto>>
        {
            StatusCode = 200,
            Body = ApiResponse<List<AttendanceListItemDto>>.Ok(items, "Lấy danh sách người cao tuổi đang có mặt hôm nay thành công.")
        };
    }

    public async Task<AttendanceActionResult<UpdateAttendanceResponseDto>> UpdateAsync(
        int userId,
        int attendanceId,
        UpdateAttendanceRequestDto request)
    {
        if (attendanceId <= 0)
        {
            return FailUpdate(400, "Mã điểm danh không hợp lệ.");
        }

        var user = await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
        {
            return FailUpdate(401, "Không xác thực được người dùng. Vui lòng đăng nhập lại.");
        }

        if (!user.IsActive)
        {
            return FailUpdate(403, "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        if (user.Roles == null || !user.Roles.Any(r => r.RoleName == "Staff"))
        {
            return FailUpdate(403, "Bạn không có quyền chỉnh sửa điểm danh.");
        }

        if (string.IsNullOrWhiteSpace(request.CorrectionReason))
        {
            return FailUpdate(400, "Lý do chỉnh sửa không được để trống.");
        }

        var record = await _context.AttendanceRecords
            .FirstOrDefaultAsync(a => a.AttendanceId == attendanceId);

        if (record == null)
        {
            return FailUpdate(404, "Không tìm thấy bản ghi điểm danh.");
        }

        // Giữ nguyên giá trị wall-clock, không chuyển UTC (theo VietnamTime / Unspecified).
        var checkInAt = DateTime.SpecifyKind(request.CheckInAt, DateTimeKind.Unspecified);
        DateTime? checkOutAt = request.CheckOutAt.HasValue
            ? DateTime.SpecifyKind(request.CheckOutAt.Value, DateTimeKind.Unspecified)
            : null;

        if (DateOnly.FromDateTime(checkInAt) != record.AttendanceDate)
        {
            return FailUpdate(400, "Thời gian check-in phải thuộc đúng ngày điểm danh của bản ghi.");
        }

        if (checkOutAt.HasValue)
        {
            if (DateOnly.FromDateTime(checkOutAt.Value) != record.AttendanceDate)
            {
                return FailUpdate(400, "Thời gian check-out phải thuộc đúng ngày điểm danh của bản ghi.");
            }

            if (checkOutAt.Value < checkInAt)
            {
                return FailUpdate(400, "Thời gian check-out phải sau hoặc bằng thời gian check-in.");
            }
        }

        var originalUpdatedAt = record.UpdatedAt;

        record.CheckInAt = checkInAt;
        record.CheckInTime = TimeOnly.FromDateTime(checkInAt);

        if (checkOutAt.HasValue)
        {
            record.CheckOutAt = checkOutAt.Value;
            record.CheckOutTime = TimeOnly.FromDateTime(checkOutAt.Value);
            record.Status = "CheckedOut";
            // Không tự gán CheckedOutBy khi chỉnh sửa; giữ nguyên giá trị hiện có.
        }
        else
        {
            record.CheckOutAt = null;
            record.CheckOutTime = null;
            record.CheckedOutBy = null;
            record.Status = "Present";
        }

        record.UpdatedAt = VietnamTime.Now;
        record.UpdatedBy = userId;
        record.CorrectionReason = request.CorrectionReason.Trim();

        try
        {
            // Soft concurrency: từ chối nếu UpdatedAt đã đổi sau khi load (best-effort, không có rowversion).
            var latestStamp = await _context.AttendanceRecords
                .AsNoTracking()
                .Where(a => a.AttendanceId == attendanceId)
                .Select(a => a.UpdatedAt)
                .FirstAsync();

            if (latestStamp != originalUpdatedAt)
            {
                _context.ChangeTracker.Clear();
                return FailUpdate(409, "Bản ghi điểm danh đã được chỉnh sửa bởi người khác. Vui lòng tải lại và thử lại.");
            }

            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            _context.ChangeTracker.Clear();
            return FailUpdate(409, "Bản ghi điểm danh đã được chỉnh sửa bởi người khác. Vui lòng tải lại và thử lại.");
        }

        return new AttendanceActionResult<UpdateAttendanceResponseDto>
        {
            StatusCode = 200,
            Body = ApiResponse<UpdateAttendanceResponseDto>.Ok(MapUpdate(record), "Chỉnh sửa điểm danh thành công.")
        };
    }

    /// <summary>
    /// Giữ Notes check-in; nếu có notes check-out thì nối thêm, không ghi đè/xóa ghi chú cũ.
    /// </summary>
    private static void MergeNotes(AttendanceRecord record, string? checkOutNotes)
    {
        if (string.IsNullOrWhiteSpace(checkOutNotes))
        {
            return;
        }

        var addition = checkOutNotes.Trim();
        if (string.IsNullOrWhiteSpace(record.Notes))
        {
            record.Notes = TruncateNotes(addition);
            return;
        }

        record.Notes = TruncateNotes($"{record.Notes.Trim()} | Check-out: {addition}");
    }

    private static string TruncateNotes(string notes) =>
        notes.Length <= 500 ? notes : notes[..500];

    /// <summary>
    /// Đăng ký Confirmed còn hiệu lực và ngày check-in thuộc lịch sử dụng đã đăng ký.
    /// Quy tắc lịch lấy từ FE/Billing (all|mwf|tts, SelectedDatesJson) và DailyPlanningService.ShouldAttend.
    /// </summary>
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

    /// <summary>
    /// daily: ngày phải có trong SelectedDatesJson (yyyy-MM-dd) — như DailyPlanningService.
    /// monthly: MonthlyPattern all/mwf/tts (FE/Billing) hoặc mon_wed_fri/tue_thu_sat (DailyPlanning/StaffAssignment).
    /// </summary>
    private static bool IsServiceDay(ServiceRegistration registration, DateOnly date)
    {
        var dayOfWeek = date.DayOfWeek;

        if (registration.RegistrationType.Equals("daily", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(registration.SelectedDatesJson))
            {
                return false;
            }

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

        // monthly (và mọi loại không phải daily — cùng nhánh else của StaffAssignmentService)
        var pattern = registration.MonthlyPattern?.ToLowerInvariant();
        return pattern switch
        {
            "mwf" or "mon_wed_fri" =>
                dayOfWeek is DayOfWeek.Monday or DayOfWeek.Wednesday or DayOfWeek.Friday,
            "tts" or "tue_thu_sat" =>
                dayOfWeek is DayOfWeek.Tuesday or DayOfWeek.Thursday or DayOfWeek.Saturday,
            // "all" (FE/Billing) và nhánh mặc định của DailyPlanning: T2–T7, nghỉ Chủ nhật
            "all" or _ => dayOfWeek != DayOfWeek.Sunday
        };
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

    private static AttendanceActionResult<UpdateAttendanceResponseDto> FailUpdate(int statusCode, string message) => new()
    {
        StatusCode = statusCode,
        Body = ApiResponse<UpdateAttendanceResponseDto>.Fail(message)
    };

    private static UpdateAttendanceResponseDto MapUpdate(AttendanceRecord record) => new()
    {
        AttendanceId = record.AttendanceId,
        ElderlyId = record.ElderlyId,
        AttendanceDate = record.AttendanceDate,
        CheckInAt = record.CheckInAt ?? default,
        CheckOutAt = record.CheckOutAt,
        Status = record.Status,
        UpdatedAt = record.UpdatedAt,
        UpdatedBy = record.UpdatedBy,
        CorrectionReason = record.CorrectionReason
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
