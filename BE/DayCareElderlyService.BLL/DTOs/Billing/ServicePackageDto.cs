using System;
using System.Collections.Generic;

namespace DayCareElderlyService.BLL.DTOs.Billing;

public class ServicePackageDto
{
    public Guid PackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string BillingPeriod { get; set; } = "Monthly";
    public decimal PricePerDay { get; set; }
    public decimal PriceMonth3Days { get; set; }
    public decimal PriceMonthFullWeek { get; set; }
    public List<string> Highlights { get; set; } = new();
    public List<string> IncludedServices { get; set; } = new();
    public string? TargetAudience { get; set; }
    public string? PricingNote { get; set; }
    public int TotalSlots { get; set; } = 20;
    public int AvailableSlots { get; set; } = 20;
    public bool EndOfLifeRoomIncluded { get; set; }
    public bool IsActive { get; set; }
}
