using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class User
{
    public int UserId { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string? PhoneNumber { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual FamilyMember? FamilyMember { get; set; }

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual ICollection<StaffSchedule> StaffSchedules { get; set; } = new List<StaffSchedule>();

    public virtual ICollection<StaffCareAssignment> StaffCareAssignments { get; set; } = new List<StaffCareAssignment>();

    public virtual ICollection<DailyCareGroup> DailyCareGroups { get; set; } = new List<DailyCareGroup>();

    public virtual ICollection<SupplyTransaction> SupplyTransactions { get; set; } = new List<SupplyTransaction>();

    public virtual ICollection<Role> Roles { get; set; } = new List<Role>();
}
