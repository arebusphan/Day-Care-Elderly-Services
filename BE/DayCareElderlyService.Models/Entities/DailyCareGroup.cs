using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class DailyCareGroup
{
    public int GroupId { get; set; }

    public int PlanId { get; set; }

    public string GroupName { get; set; } = null!;

    public string GroupType { get; set; } = "Normal"; // "Normal" | "Support"

    public int? StaffId { get; set; }

    public int MaxNormalCapacity { get; set; } = 10;

    public int MaxSupportCapacity { get; set; } = 4;

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual DailySchedulePlan Plan { get; set; } = null!;

    public virtual User? Staff { get; set; }

    public virtual ICollection<CareGroupMember> Members { get; set; } = new List<CareGroupMember>();
}

