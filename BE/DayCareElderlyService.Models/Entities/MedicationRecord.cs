using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicationRecord
{
    public int MedicationRecordId { get; set; }

    public int MedicationPlanId { get; set; }

    public int? StaffId { get; set; }

    public DateTime ScheduledAt { get; set; }

    /// <summary>
    /// Cột legacy (DB live thường NOT NULL). Đồng bộ = ngày của ScheduledAt khi tạo liều.
    /// </summary>
    public DateOnly AdministeredDate { get; set; }

    /// <summary>
    /// Cột legacy (DB live thường NOT NULL). Đồng bộ = giờ của ScheduledAt khi tạo liều.
    /// </summary>
    public TimeOnly AdministeredTime { get; set; }

    public DateTime? RecordedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public virtual MedicationPlan MedicationPlan { get; set; } = null!;

    public virtual User? Staff { get; set; }
}
