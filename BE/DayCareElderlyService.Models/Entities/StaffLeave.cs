using System;

namespace DayCareElderlyService.Models.Entities;

public partial class StaffLeave
{
    public Guid LeaveId { get; set; }

    public Guid UserId { get; set; }

    public DateOnly LeaveDate { get; set; }

    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}
