using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ActivityAssignment
{
    public int AssignmentId { get; set; }

    public int CenterActivityId { get; set; }

    public int StaffId { get; set; }

    public string? AssignmentRole { get; set; }

    public string Status { get; set; } = null!;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual CenterActivity CenterActivity { get; set; } = null!;

    public virtual User Staff { get; set; } = null!;
}
