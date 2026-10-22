using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class IncidentReport
{
    public Guid IncidentId { get; set; }

    public Guid ElderlyId { get; set; }

    public Guid CenterId { get; set; }

    public Guid ReportedBy { get; set; }

    public string IncidentType { get; set; } = null!;

    public string Severity { get; set; } = null!;

    public string Description { get; set; } = null!;

    public DateTime OccurredAt { get; set; }

    public DateTime ReportedAt { get; set; }

    public string Status { get; set; } = null!;

    public string? ResolutionNotes { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public virtual Center Center { get; set; } = null!;

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual Staff ReportedByNavigation { get; set; } = null!;
}
