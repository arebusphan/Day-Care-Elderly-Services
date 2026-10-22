using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class AttendanceRecord
{
    public Guid AttendanceId { get; set; }

    public Guid ElderlyId { get; set; }

    public Guid RegistrationId { get; set; }

    public DateOnly AttendanceDate { get; set; }

    public DateTime? CheckInAt { get; set; }

    public DateTime? CheckOutAt { get; set; }

    public Guid? CheckedInBy { get; set; }

    public Guid? CheckedOutBy { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Staff? CheckedInByNavigation { get; set; }

    public virtual Staff? CheckedOutByNavigation { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual ServiceRegistration Registration { get; set; } = null!;
}
