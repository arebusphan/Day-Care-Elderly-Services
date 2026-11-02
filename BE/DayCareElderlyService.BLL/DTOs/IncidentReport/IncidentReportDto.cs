using System;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class IncidentReportDto
{
    public int IncidentId { get; set; }
    public int ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public int CenterId { get; set; }
    public string CenterName { get; set; } = string.Empty;
    public int ReportedBy { get; set; }
    public string ReportedByName { get; set; } = string.Empty;
    public string IncidentType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime ReportedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ResolutionNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsSupplyConfirmed { get; set; }
}
