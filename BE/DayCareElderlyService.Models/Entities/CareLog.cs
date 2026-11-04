using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class CareLog
{
    public int CareLogId { get; set; }

    public int ElderlyId { get; set; }

    public int StaffId { get; set; }


    public DateTime RecordedAt { get; set; }

    public string CareType { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string? Notes { get; set; }

    public string? Data { get; set; }

    public string? BloodPressure { get; set; }

    public decimal? BloodGlucose { get; set; }

    public bool IsInternal { get; set; }

    public virtual ICollection<CareLogPhoto> CareLogPhotos { get; set; } = new List<CareLogPhoto>();

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual User Staff { get; set; } = null!;
}
