using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ActivityAssignment
{
    public Guid AssignmentId { get; set; }

    public Guid CenterActivityId { get; set; }

    public Guid StaffId { get; set; }

    public string? AssignmentRole { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual CenterActivity CenterActivity { get; set; } = null!;

    public virtual Staff Staff { get; set; } = null!;
}
