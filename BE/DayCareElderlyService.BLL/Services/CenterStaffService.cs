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
            .Include(u => u.StaffLeaves)
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
            var todayLeave = u.StaffLeaves.FirstOrDefault(l => l.LeaveDate == today);
            string todayStatus;
            string? todayReason;

            if (isSunday)
            {
                todayStatus = "Nghỉ";
                todayReason = "Chủ nhật (Trung tâm đóng cửa)";
            }
            else if (todayLeave != null)
            {
                todayStatus = "Nghỉ";
                todayReason = string.IsNullOrWhiteSpace(todayLeave.Reason) ? "Nghỉ phép" : todayLeave.Reason;
            }
            else
            {
                todayStatus = "Đi làm";
                todayReason = null;
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
                TodayReason = todayReason
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
            UserId = Guid.NewGuid(),
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
            TodayReason = isSunday ? "Chủ nhật (Trung tâm đóng cửa)" : null
        }, "Thêm nhân viên mới thành công.");
    }

    public async Task<ApiResponse<DeactivationWarningDto>> CheckDeactivationWarningAsync(Guid staffUserId)
    {
        var user = await _context.Users.FindAsync(staffUserId);
        if (user == null)
        {
            return ApiResponse<DeactivationWarningDto>.Fail("Không tìm thấy nhân viên.");
        }

        var today = GetVietnamToday();

        var futureLeavesCount = await _context.StaffLeaves
            .CountAsync(l => l.UserId == staffUserId && l.LeaveDate >= today);

        var futureShiftsCount = await _context.StaffShifts
            .CountAsync(s => s.StaffId == staffUserId && s.ShiftDate >= today);

        var hasFuture = futureLeavesCount > 0 || futureShiftsCount > 0;
        string? message = null;

        if (hasFuture)
        {
            var parts = new List<string>();
            if (futureLeavesCount > 0) parts.Add($"{futureLeavesCount} ngày nghỉ");
            if (futureShiftsCount > 0) parts.Add($"{futureShiftsCount} ca trực");
            message = $"Nhân viên này vẫn còn {string.Join(" và ", parts)} đã lên lịch từ hôm nay trở đi.";
        }

        return ApiResponse<DeactivationWarningDto>.Ok(new DeactivationWarningDto
        {
            HasFutureSchedules = hasFuture,
            FutureLeavesCount = futureLeavesCount,
            FutureShiftsCount = futureShiftsCount,
            Message = message
        });
    }

    public async Task<ApiResponse<bool>> ToggleStaffStatusAsync(Guid staffUserId, Guid currentManagerUserId)
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

    public async Task<ApiResponse<List<StaffLeaveDto>>> GetStaffLeavesAsync(Guid staffUserId)
    {
        var leaves = await _context.StaffLeaves
            .Where(l => l.UserId == staffUserId)
            .OrderByDescending(l => l.LeaveDate)
            .Select(l => new StaffLeaveDto
            {
                LeaveId = l.LeaveId,
                UserId = l.UserId,
                LeaveDate = l.LeaveDate,
                Reason = l.Reason,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();

        return ApiResponse<List<StaffLeaveDto>>.Ok(leaves);
    }

    public async Task<ApiResponse<StaffLeaveDto>> AddStaffLeaveAsync(Guid staffUserId, CreateStaffLeaveDto dto)
    {
        var user = await _context.Users.FindAsync(staffUserId);
        if (user == null)
        {
            return ApiResponse<StaffLeaveDto>.Fail("Không tìm thấy thông tin nhân viên.");
        }

        var today = GetVietnamToday();

        // 1. Không cho đặt ngày nghỉ cho ngày đã qua
        if (dto.LeaveDate < today)
        {
            return ApiResponse<StaffLeaveDto>.Fail("Không thể đặt ngày nghỉ cho ngày đã qua.");
        }

        // 2. Không cho đặt ngày nghỉ vào Chủ nhật (trung tâm đóng cửa)
        if (dto.LeaveDate.DayOfWeek == DayOfWeek.Sunday)
        {
            return ApiResponse<StaffLeaveDto>.Fail("Không thể đặt ngày nghỉ vào Chủ nhật (trung tâm nghỉ cố định).");
        }

        // 3. Mỗi nhân viên mỗi ngày tối đa một dòng
        var exists = await _context.StaffLeaves
            .AnyAsync(l => l.UserId == staffUserId && l.LeaveDate == dto.LeaveDate);
        if (exists)
        {
            return ApiResponse<StaffLeaveDto>.Fail("Nhân viên đã có lịch nghỉ vào ngày này.");
        }

        var leave = new StaffLeave
        {
            LeaveId = Guid.NewGuid(),
            UserId = staffUserId,
            LeaveDate = dto.LeaveDate,
            Reason = dto.Reason?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _context.StaffLeaves.AddAsync(leave);
        await _context.SaveChangesAsync();

        return ApiResponse<StaffLeaveDto>.Ok(new StaffLeaveDto
        {
            LeaveId = leave.LeaveId,
            UserId = leave.UserId,
            LeaveDate = leave.LeaveDate,
            Reason = leave.Reason,
            CreatedAt = leave.CreatedAt
        }, "Đã thêm ngày nghỉ cho nhân viên thành công.");
    }

    public async Task<ApiResponse<bool>> DeleteStaffLeaveAsync(Guid staffUserId, Guid leaveId)
    {
        var leave = await _context.StaffLeaves
            .FirstOrDefaultAsync(l => l.LeaveId == leaveId && l.UserId == staffUserId);

        if (leave == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy ngày nghỉ cần xóa.");
        }

        _context.StaffLeaves.Remove(leave);
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã xóa ngày nghỉ thành công.");
    }
}
