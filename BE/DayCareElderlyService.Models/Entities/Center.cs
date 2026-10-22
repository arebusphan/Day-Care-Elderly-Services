using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class Center
{
    public Guid CenterId { get; set; }

    public string CenterName { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public string? Email { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<ActivityTemplate> ActivityTemplates { get; set; } = new List<ActivityTemplate>();

    public virtual ICollection<CenterActivity> CenterActivities { get; set; } = new List<CenterActivity>();

    public virtual ICollection<ElderlyMember> ElderlyMembers { get; set; } = new List<ElderlyMember>();

    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    public virtual ICollection<MedicalSupply> MedicalSupplies { get; set; } = new List<MedicalSupply>();

    public virtual ICollection<ServicePackage> ServicePackages { get; set; } = new List<ServicePackage>();

    public virtual ICollection<Staff> Staff { get; set; } = new List<Staff>();
}
