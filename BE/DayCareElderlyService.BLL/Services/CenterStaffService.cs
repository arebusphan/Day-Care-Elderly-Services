using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CenterStaff;
using DayCareElderlyService.BLL.Security;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class CenterStaffService : ICenterStaffService
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public CenterStaffService(AppDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    private static DateOnly GetVietnamToday()
    {
        return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
    }

    public async Task<ApiResponse<PagedResult<CenterStaffDto>>> GetStaffListAsync(CenterStaffFilterDto filter)
    {
        var query = _context.Users
            .Include(u => u.Roles)
            .Include(u => u.StaffSchedules)
            .Where(u => u.Roles.Any(r => r.RoleName == "Staff"));

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            query = query.Where(u => u.FullName.ToLower().Contains(search) || u.Email.ToLower().Contains(search));
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == filter.IsActive.Value);
        }

        var totalItems = await query.CountAsync();

        var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
        var pageSize = filter.PageSize < 1 ? 10 : filter.PageSize;

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var today = GetVietnamToday();
        var isSunday = today.DayOfWeek == DayOfWeek.Sunday;

        var dtos = users.Select(u =>
        {
            var todaySchedule = u.StaffSchedules.FirstOrDefault(s => s.WorkDate == today);
            string todayStatus;
            string? todayNote;

            if (isSunday)
            {
                todayStatus = "Nghỉ";
                todayNote = "Chủ nhật (Trung tâm đóng cửa)";
            }
            else if (todaySchedule != null)
            {
                todayStatus = todaySchedule.IsWorking ? "Đi làm" : "Nghỉ";
                todayNote = todaySchedule.Note;
            }
            else
            {
                // Mặc định nếu chưa xếp lịch thì coi là đi làm
                todayStatus = "Đi làm";
                todayNote = null;
            }

            return new CenterStaffDto
            {
                UserId = u.UserId,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                TodayStatus = todayStatus,
                TodayNote = todayNote
            };
        }).ToList();

        var result = new PagedResult<CenterStaffDto>(dtos, totalItems, pageNumber, pageSize);

        return ApiResponse<PagedResult<CenterStaffDto>>.Ok(result);
    }

    public async Task<ApiResponse<CenterStaffDto>> CreateStaffAsync(CreateCenterStaffDto dto)
    {
        var email = dto.Email.Trim().ToLower();

        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == email))
        {
            return ApiResponse<CenterStaffDto>.Fail("Email đã được sử dụng trong hệ thống.");
        }

        var staffRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Staff");
        if (staffRole == null)
        {
            staffRole = new Role
            {
                RoleName = "Staff",
                Description = "Nhân viên chăm sóc và điều dưỡng"
            };
            await _context.Roles.AddAsync(staffRole);
            await _context.SaveChangesAsync();
        }

        var newUser = new User
        {
            FullName = dto.FullName.Trim(),
            Email = email,
            PhoneNumber = dto.PhoneNumber?.Trim(),
            PasswordHash = _passwordHasher.HashPassword(dto.TemporaryPassword),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Roles = new List<Role> { staffRole }
        };

        await _context.Users.AddAsync(newUser);
        await _context.SaveChangesAsync();

        var today = GetVietnamToday();
        var isSunday = today.DayOfWeek == DayOfWeek.Sunday;

        return ApiResponse<CenterStaffDto>.Ok(new CenterStaffDto
        {
            UserId = newUser.UserId,
            FullName = newUser.FullName,
            Email = newUser.Email,
            PhoneNumber = newUser.PhoneNumber,
            IsActive = newUser.IsActive,
            CreatedAt = newUser.CreatedAt,
            TodayStatus = isSunday ? "Nghỉ" : "Đi làm",
            TodayNote = isSunday ? "Chủ nhật (Trung tâm đóng cửa)" : null
        }, "Thêm nhân viên mới thành công.");
    }

    public async Task<ApiResponse<DeactivationWarningDto>> CheckDeactivationWarningAsync(int staffUserId)
    {
        var user = await _context.Users.FindAsync(staffUserId);
        if (user == null)
        {
            return ApiResponse<DeactivationWarningDto>.Fail("Không tìm thấy nhân viên.");
        }

        var today = GetVietnamToday();

        var futureSchedulesCount = await _context.StaffSchedules
            .CountAsync(s => s.StaffId == staffUserId && s.WorkDate >= today);

        var hasFuture = futureSchedulesCount > 0;
        string? message = null;

        if (hasFuture)
        {
            message = $"Nhân viên này vẫn còn {futureSchedulesCount} ngày đã lên lịch từ hôm nay trở đi.";
        }

        return ApiResponse<DeactivationWarningDto>.Ok(new DeactivationWarningDto
        {
            HasFutureSchedules = hasFuture,
            FutureSchedulesCount = futureSchedulesCount,
            Message = message
        });
    }

    public async Task<ApiResponse<bool>> ToggleStaffStatusAsync(int staffUserId, int currentManagerUserId)
    {
        if (staffUserId == currentManagerUserId)
        {
            return ApiResponse<bool>.Fail("Bạn không thể tự ngừng hoạt động tài khoản của chính mình.");
        }

        var user = await _context.Users.FindAsync(staffUserId);
        if (user == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy thông tin nhân viên.");
        }

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        var statusText = user.IsActive ? "Đang hoạt động" : "Ngừng hoạt động";
        return ApiResponse<bool>.Ok(user.IsActive, $"Đã cập nhật trạng thái nhân viên thành \"{statusText}\".");
    }

    public async Task<ApiResponse<List<StaffScheduleDto>>> GetStaffSchedulesAsync(int staffUserId)
    {
        var schedules = await _context.StaffSchedules
            .Where(s => s.StaffId == staffUserId)
            .OrderByDescending(s => s.WorkDate)
            .Select(s => new StaffScheduleDto
            {
                ScheduleId = s.ScheduleId,
                StaffId = s.StaffId,
                WorkDate = s.WorkDate,
                IsWorking = s.IsWorking,
                Note = s.Note,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<StaffScheduleDto>>.Ok(schedules);
    }

    public async Task<ApiResponse<StaffScheduleDto>> SetStaffScheduleAsync(int staffUserId, CreateStaffScheduleDto dto)
    {
        var user = await _context.Users.FindAsync(staffUserId);
        if (user == null)
        {
            return ApiResponse<StaffScheduleDto>.Fail("Không tìm thấy thông tin nhân viên.");
        }

        var today = GetVietnamToday();

        // 1. Không cho đặt lịch cho ngày đã qua
        if (dto.WorkDate < today)
        {
            return ApiResponse<StaffScheduleDto>.Fail("Không thể đặt lịch cho ngày đã qua.");
        }

        // 2. Không cho đặt lịch vào Chủ nhật (trung tâm đóng cửa)
        if (dto.WorkDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return ApiResponse<StaffScheduleDto>.Fail("Không thể đặt lịch vào Chủ nhật (trung tâm nghỉ cố định).");
        }

        // 3. Tìm xem đã có lịch ngày đó chưa → nếu có thì cập nhật, chưa có thì tạo mới
        var existing = await _context.StaffSchedules
            .FirstOrDefaultAsync(s => s.StaffId == staffUserId && s.WorkDate == dto.WorkDate);

        if (existing != null)
        {
            existing.IsWorking = dto.IsWorking;
            existing.Note = dto.Note?.Trim();
            _context.StaffSchedules.Update(existing);
            await _context.SaveChangesAsync();

            return ApiResponse<StaffScheduleDto>.Ok(new StaffScheduleDto
            {
                ScheduleId = existing.ScheduleId,
                StaffId = existing.StaffId,
                WorkDate = existing.WorkDate,
                IsWorking = existing.IsWorking,
                Note = existing.Note,
                CreatedAt = existing.CreatedAt
            }, "Đã cập nhật lịch làm việc thành công.");
        }

        var schedule = new StaffSchedule
        {
            StaffId = staffUserId,
            WorkDate = dto.WorkDate,
            IsWorking = dto.IsWorking,
            Note = dto.Note?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _context.StaffSchedules.AddAsync(schedule);
        await _context.SaveChangesAsync();

        return ApiResponse<StaffScheduleDto>.Ok(new StaffScheduleDto
        {
            ScheduleId = schedule.ScheduleId,
            StaffId = schedule.StaffId,
            WorkDate = schedule.WorkDate,
            IsWorking = schedule.IsWorking,
            Note = schedule.Note,
            CreatedAt = schedule.CreatedAt
        }, "Đã thêm lịch làm việc thành công.");
    }

    public async Task<ApiResponse<bool>> DeleteStaffScheduleAsync(int staffUserId, int scheduleId)
    {
        var schedule = await _context.StaffSchedules
            .FirstOrDefaultAsync(s => s.ScheduleId == scheduleId && s.StaffId == staffUserId);

        if (schedule == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy lịch làm việc cần xóa.");
        }

        _context.StaffSchedules.Remove(schedule);
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa lịch làm việc thành công.");
    }
}
