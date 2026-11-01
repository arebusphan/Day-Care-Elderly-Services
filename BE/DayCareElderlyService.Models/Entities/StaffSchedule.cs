using System;

namespace DayCareElderlyService.Models.Entities;

/// <summary>
/// Quản lý trạng thái làm việc / lịch của nhân viên theo ngày (biết ngày hôm đó có đi làm hay không để xếp lịch)
/// </summary>
public partial class StaffSchedule
{
    public int ScheduleId { get; set; }

    public int StaffId { get; set; }

    public DateOnly WorkDate { get; set; }

    /// <summary>
    /// true: Đi làm, false: Nghỉ
    /// </summary>
    public bool IsWorking { get; set; }

    /// <summary>
    /// Trạng thái chi tiết: "Working" | "Off" | "Leave"
    /// </summary>
    public string Availability { get; set; } = "Working";

    /// <summary>
    /// Ghi chú / lý do nếu nghỉ hoặc lưu ý công việc
    /// </summary>
    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User Staff { get; set; } = null!;
}

