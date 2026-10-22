using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class StaffShift
{
    public Guid StaffShiftId { get; set; }

    public Guid StaffId { get; set; }

    public DateOnly ShiftDate { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public TimeOnly? BreakStartTime { get; set; }

    public TimeOnly? BreakEndTime { get; set; }

    public string Status { get; set; } = null!;

    public Guid CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User CreatedByNavigation { get; set; } = null!;

    public virtual Staff Staff { get; set; } = null!;
}
