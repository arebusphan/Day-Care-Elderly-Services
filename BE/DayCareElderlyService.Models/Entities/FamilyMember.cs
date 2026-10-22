using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class FamilyMember
{
    public Guid FamilyMemberId { get; set; }

    public Guid UserId { get; set; }

    public string? Address { get; set; }

    public string? EmergencyContact { get; set; }

    public virtual ICollection<ElderlyFamilyRelationship> ElderlyFamilyRelationships { get; set; } = new List<ElderlyFamilyRelationship>();

    public virtual User User { get; set; } = null!;
}
