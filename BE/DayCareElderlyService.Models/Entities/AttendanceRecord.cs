using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class AttendanceRecord
{
    public int AttendanceId { get; set; }

    public int ElderlyId { get; set; }

    public int RegistrationId { get; set; }

    public DateOnly AttendanceDate { get; set; }

    public DateTime? CheckInAt { get; set; }

    public DateTime? CheckOutAt { get; set; }

    public int? CheckedInBy { get; set; }

    public int? CheckedOutBy { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? CheckedInByNavigation { get; set; }

    public virtual User? CheckedOutByNavigation { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual ServiceRegistration Registration { get; set; } = null!;
}
