using System;

namespace DayCareElderlyService.Models.Entities;

/// <summary>
/// Dự báo điểm danh cho người cao tuổi trong ngày (Step 1 Daily Planning)
/// </summary>
public partial class DailyAttendanceForecast
{
    public int ForecastId { get; set; }

    public int PlanId { get; set; }

    public int ElderlyId { get; set; }

    /// <summary>
    /// Trạng thái dự kiến: "Attending" | "Absent" | "Modified"
    /// </summary>
    public string AttendanceStatus { get; set; } = "Attending";

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual DailySchedulePlan Plan { get; set; } = null!;

    public virtual ElderlyMember Elderly { get; set; } = null!;
}

