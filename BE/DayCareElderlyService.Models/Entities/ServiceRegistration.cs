using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ServiceRegistration
{
    public int RegistrationId { get; set; }

    public int ElderlyId { get; set; }

    public int PackageId { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public decimal PriceAtPurchase { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string RegistrationCode { get; set; } = null!;

    public string RegistrationType { get; set; } = "monthly";

    public string? MonthlyPattern { get; set; }

    public string RoomType { get; set; } = "large";

    public int TotalDays { get; set; } = 1;

    public decimal SupportSurcharge { get; set; }

    public decimal RoomSurcharge { get; set; }

    public decimal TotalAmount { get; set; }

    public string? SelectedDatesJson { get; set; }

    public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual ServicePackage Package { get; set; } = null!;

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
