using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class CareLog
{
    public Guid CareLogId { get; set; }

    public Guid ElderlyId { get; set; }

    public Guid StaffId { get; set; }

    public Guid? CenterActivityId { get; set; }

    public DateTime RecordedAt { get; set; }

    public string CareType { get; set; } = null!;

    public string Description { get; set; } = null!;

    public string? Notes { get; set; }

    public virtual ICollection<CareLogPhoto> CareLogPhotos { get; set; } = new List<CareLogPhoto>();

    public virtual CenterActivity? CenterActivity { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual Staff Staff { get; set; } = null!;
}
