using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class CenterActivity
{
    public Guid CenterActivityId { get; set; }

    public Guid CenterId { get; set; }

    public Guid? PackageActivityId { get; set; }

    public string ActivityName { get; set; } = null!;

    public DateOnly ActivityDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public string? Location { get; set; }

    public string Status { get; set; } = null!;

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ActivityAssignment> ActivityAssignments { get; set; } = new List<ActivityAssignment>();

    public virtual ICollection<CareLog> CareLogs { get; set; } = new List<CareLog>();

    public virtual Center Center { get; set; } = null!;

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual PackageActivity? PackageActivity { get; set; }
}
