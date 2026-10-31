using System;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CenterStaff;

public class StaffLeaveDto
{
    public Guid LeaveId { get; set; }

    public Guid UserId { get; set; }

    public DateOnly LeaveDate { get; set; }

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }
}

public class CreateStaffLeaveDto
{
    [Required(ErrorMessage = "Ngày nghỉ là bắt buộc.")]
    public DateOnly LeaveDate { get; set; }

    [StringLength(500, ErrorMessage = "Lý do không được vượt quá 500 ký tự.")]
    public string? Reason { get; set; }
}

public class DeactivationWarningDto
{
    public bool HasFutureSchedules { get; set; }

    public int FutureLeavesCount { get; set; }

    public int FutureShiftsCount { get; set; }

    public string? Message { get; set; }
}
