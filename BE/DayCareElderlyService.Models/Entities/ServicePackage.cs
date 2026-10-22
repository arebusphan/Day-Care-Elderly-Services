using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ServicePackage
{
    public Guid PackageId { get; set; }

    public Guid CenterId { get; set; }

    public string PackageName { get; set; } = null!;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string BillingPeriod { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public decimal PricePerDay { get; set; }

    public decimal PriceMonth3Days { get; set; }

    public decimal PriceMonthFullWeek { get; set; }

    public string? Highlights { get; set; }

    public string? IncludedServices { get; set; }

    public string? TargetAudience { get; set; }

    public string? PricingNote { get; set; }

    public int TotalSlots { get; set; } = 20;

    public bool EndOfLifeRoomIncluded { get; set; }

    public virtual Center Center { get; set; } = null!;

    public virtual ICollection<PackageActivity> PackageActivities { get; set; } = new List<PackageActivity>();

    public virtual ICollection<ServiceRegistration> ServiceRegistrations { get; set; } = new List<ServiceRegistration>();
}
