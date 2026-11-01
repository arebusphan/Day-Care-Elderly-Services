using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicationRecord
{
    public int MedicationRecordId { get; set; }

    public int MedicationPlanId { get; set; }

    public int StaffId { get; set; }

    public DateTime ScheduledAt { get; set; }

    public DateTime? RecordedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public virtual MedicationPlan MedicationPlan { get; set; } = null!;

    public virtual User Staff { get; set; } = null!;
}
