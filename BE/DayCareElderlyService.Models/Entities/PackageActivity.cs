using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class PackageActivity
{
    public int PackageActivityId { get; set; }

    public int PackageId { get; set; }

    public int? ActivityTemplateId { get; set; }

    public byte? DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    public virtual ServicePackage Package { get; set; } = null!;
}
