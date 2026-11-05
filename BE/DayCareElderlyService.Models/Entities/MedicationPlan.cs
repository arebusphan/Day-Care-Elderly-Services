using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicationPlan
{
    public int MedicationPlanId { get; set; }

    public int ElderlyId { get; set; }

    public string MedicationName { get; set; } = null!;

    public string Dosage { get; set; } = null!;

    public string? Instructions { get; set; }

    /// <summary>
    /// Giờ uống trong ngày, lưu dạng "08:00,20:00" (HH:mm, phân tách bằng dấu phẩy).
    /// </summary>
    public string ScheduleTimes { get; set; } = null!;

    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual ICollection<MedicationRecord> MedicationRecords { get; set; } = new List<MedicationRecord>();
}
