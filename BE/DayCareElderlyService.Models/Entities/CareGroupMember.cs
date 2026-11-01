using System;

namespace DayCareElderlyService.Models.Entities;

public partial class CareGroupMember
{
    public int GroupMemberId { get; set; }

    public int GroupId { get; set; }

    public int ElderlyId { get; set; }

    public DateTime AssignedAt { get; set; }

    public string? Notes { get; set; }

    public virtual DailyCareGroup Group { get; set; } = null!;

    public virtual ElderlyMember Elderly { get; set; } = null!;
}

