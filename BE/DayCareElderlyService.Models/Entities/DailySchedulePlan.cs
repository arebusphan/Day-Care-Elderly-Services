using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

/// <summary>
/// Kế hoạch phân công chăm sóc người cao tuổi cho nhân viên theo ngày
/// </summary>
public partial class DailySchedulePlan
{
    public int PlanId { get; set; }

    public int CenterId { get; set; }

    public DateOnly PlanDate { get; set; }

    /// <summary>
    /// Trạng thái kế hoạch: "Draft" (Bản nháp / Vừa chia xong) hoặc "Confirmed" (Đã xác nhận)
    /// </summary>
    public string Status { get; set; } = "Draft";

    public DateTime? ConfirmedAt { get; set; }

    public int? ConfirmedBy { get; set; }

    public int TotalStaff { get; set; }

    public int TotalElderly { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual Center Center { get; set; } = null!;

    public virtual User? ConfirmedByNavigation { get; set; }

    public virtual ICollection<StaffCareAssignment> Assignments { get; set; } = new List<StaffCareAssignment>();

    public virtual ICollection<DailyCareGroup> CareGroups { get; set; } = new List<DailyCareGroup>();

    public virtual ICollection<DailyAttendanceForecast> AttendanceForecasts { get; set; } = new List<DailyAttendanceForecast>();
}

