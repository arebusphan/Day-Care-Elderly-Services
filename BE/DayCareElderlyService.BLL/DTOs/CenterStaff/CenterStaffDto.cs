using System;

namespace DayCareElderlyService.BLL.DTOs.CenterStaff;

public class CenterStaffDto
{
    public Guid UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Trạng thái ngày hôm nay: "Đi làm" hoặc "Nghỉ"
    /// </summary>
    public string TodayStatus { get; set; } = "Đi làm";

    /// <summary>
    /// Lý do nếu nghỉ hôm nay (ví dụ: Nghỉ phép, Chủ nhật...)
    /// </summary>
    public string? TodayReason { get; set; }
}

public class CenterStaffFilterDto
{
    public string? Search { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
