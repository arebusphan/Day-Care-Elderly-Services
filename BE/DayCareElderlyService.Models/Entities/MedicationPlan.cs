using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicationPlan
{
    public Guid MedicationPlanId { get; set; }

    public Guid ElderlyId { get; set; }

    public string MedicationName { get; set; } = null!;

    public string Dosage { get; set; } = null!;

    public string? Instructions { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual ICollection<MedicationRecord> MedicationRecords { get; set; } = new List<MedicationRecord>();
}
