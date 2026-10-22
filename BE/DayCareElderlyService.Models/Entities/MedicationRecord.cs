using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicationRecord
{
    public Guid MedicationRecordId { get; set; }

    public Guid MedicationPlanId { get; set; }

    public Guid StaffId { get; set; }

    public DateTime ScheduledAt { get; set; }

    public DateTime? RecordedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public virtual MedicationPlan MedicationPlan { get; set; } = null!;

    public virtual Staff Staff { get; set; } = null!;
}
