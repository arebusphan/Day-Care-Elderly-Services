using System.ComponentModel.DataAnnotations;
using DayCareElderlyService.BLL.Common;

namespace DayCareElderlyService.BLL.DTOs.Attendance;

public class CheckInRequestDto
{
    [Required(ErrorMessage = "Vui lòng chọn người cao tuổi.")]
    [Range(1, int.MaxValue, ErrorMessage = "Mã người cao tuổi không hợp lệ.")]
    public int ElderlyId { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Notes { get; set; }
}

public class CheckInResponseDto
{
    public int AttendanceId { get; set; }
    public int ElderlyId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime CheckInAt { get; set; }
    public string Status { get; set; } = "Present";
}

public class CheckOutRequestDto
{
    [Required(ErrorMessage = "Vui lòng chọn người cao tuổi.")]
    [Range(1, int.MaxValue, ErrorMessage = "Mã người cao tuổi không hợp lệ.")]
    public int ElderlyId { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Notes { get; set; }
}

public class CheckOutResponseDto
{
    public int AttendanceId { get; set; }
    public int ElderlyId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime CheckInAt { get; set; }
    public DateTime CheckOutAt { get; set; }
    public string Status { get; set; } = "CheckedOut";
}

public class AttendanceListItemDto
{
    public int AttendanceId { get; set; }
    public int ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public DateOnly AttendanceDate { get; set; }
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? CheckedInBy { get; set; }
    public int? CheckedOutBy { get; set; }
    public int? RegistrationId { get; set; }
    public string? Notes { get; set; }
}

public class AttendanceDetailDto
{
    public int AttendanceId { get; set; }
    public int ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public int? RegistrationId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public int? CheckedInBy { get; set; }
    public int? CheckedOutBy { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public string? CorrectionReason { get; set; }
}

public class UpdateAttendanceRequestDto
{
    [Required(ErrorMessage = "Vui lòng nhập thời gian check-in.")]
    public DateTime CheckInAt { get; set; }

    public DateTime? CheckOutAt { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập lý do chỉnh sửa.")]
    [MinLength(1, ErrorMessage = "Lý do chỉnh sửa không được để trống.")]
    [StringLength(500, ErrorMessage = "Lý do chỉnh sửa tối đa 500 ký tự.")]
    public string CorrectionReason { get; set; } = string.Empty;
}

public class UpdateAttendanceResponseDto
{
    public int AttendanceId { get; set; }
    public int ElderlyId { get; set; }
    public DateOnly AttendanceDate { get; set; }
    public DateTime CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    public string? CorrectionReason { get; set; }
}

public class AttendanceActionResult<T>
{
    public int StatusCode { get; init; }
    public ApiResponse<T> Body { get; init; } = null!;
}
