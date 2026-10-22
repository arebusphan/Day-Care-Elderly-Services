using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ActivityTemplate
{
    public Guid ActivityTemplateId { get; set; }

    public Guid CenterId { get; set; }

    public string ActivityName { get; set; } = null!;

    public string? Description { get; set; }

    public string? DefaultLocation { get; set; }

    public bool IsActive { get; set; }

    public virtual Center Center { get; set; } = null!;

    public virtual ICollection<PackageActivity> PackageActivities { get; set; } = new List<PackageActivity>();
}
