using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ElderlyFamilyRelationship
{
    public Guid ElderlyId { get; set; }

    public Guid FamilyMemberId { get; set; }

    public string Relationship { get; set; } = null!;

    public bool IsPrimaryContact { get; set; }

    public bool CanViewCareLogs { get; set; }

    public bool CanReceiveNotifications { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual FamilyMember FamilyMember { get; set; } = null!;
}
