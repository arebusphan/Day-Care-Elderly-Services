using System;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CenterStaff;

/// <summary>
/// DTO hiển thị lịch làm việc của nhân viên (ngày đó có đi làm hay không)
/// </summary>
public class StaffScheduleDto
{
    public int ScheduleId { get; set; }

    public int StaffId { get; set; }

    public DateOnly WorkDate { get; set; }

    /// <summary>
    /// true: Đi làm, false: Nghỉ
    /// </summary>
    public bool IsWorking { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO tạo/cập nhật lịch làm việc: chỉ cần biết ngày đó có đi hay không để xếp lịch
/// </summary>
public class CreateStaffScheduleDto
{
    [Required(ErrorMessage = "Ngày là bắt buộc.")]
    public DateOnly WorkDate { get; set; }

    /// <summary>
    /// true: Đi làm, false: Nghỉ
    /// </summary>
    public bool IsWorking { get; set; } = true;

    [StringLength(500, ErrorMessage = "Ghi chú không được vượt quá 500 ký tự.")]
    public string? Note { get; set; }
}

/// <summary>
/// Cảnh báo trước khi ngừng hoạt động nhân viên
/// </summary>
public class DeactivationWarningDto
{
    public bool HasFutureSchedules { get; set; }

    public int FutureSchedulesCount { get; set; }

    public string? Message { get; set; }
}

