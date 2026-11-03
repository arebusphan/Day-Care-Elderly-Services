using DayCareElderlyService.BLL.DTOs.Attendance;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IAttendanceService
{
    Task<AttendanceActionResult<CheckInResponseDto>> CheckInAsync(int userId, CheckInRequestDto request);

    Task<AttendanceActionResult<CheckOutResponseDto>> CheckOutAsync(int userId, CheckOutRequestDto request);

    Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetListAsync(int userId, DateOnly? date);

    Task<AttendanceActionResult<AttendanceDetailDto>> GetByIdAsync(int userId, int attendanceId);

    Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetHistoryByElderlyAsync(int userId, int elderlyId);

    Task<AttendanceActionResult<List<AttendanceListItemDto>>> GetPresentTodayAsync(int userId);

}
