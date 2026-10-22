using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class PackageActivity
{
    public Guid PackageActivityId { get; set; }

    public Guid PackageId { get; set; }

    public Guid ActivityTemplateId { get; set; }

    public byte? DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public virtual ActivityTemplate ActivityTemplate { get; set; } = null!;

    public virtual ICollection<CenterActivity> CenterActivities { get; set; } = new List<CenterActivity>();

    public virtual ServicePackage Package { get; set; } = null!;
}
