using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class IncidentReport
{
    public int IncidentId { get; set; }

    public int ElderlyId { get; set; }


    public int ReportedBy { get; set; }

    public string IncidentType { get; set; } = null!;

    public string Severity { get; set; } = null!;

    public string Description { get; set; } = null!;

    public DateTime OccurredAt { get; set; }

    public DateTime ReportedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? ResolutionNotes { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public bool IsSupplyConfirmed { get; set; } = false;

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual User ReportedByNavigation { get; set; } = null!;
}
