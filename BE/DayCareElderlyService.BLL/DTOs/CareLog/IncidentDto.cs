namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Sự cố / cảnh báo (1 dòng IncidentReports)
/// </summary>
public class IncidentDto
{
    public Guid IncidentId { get; set; }
    public Guid ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public string IncidentType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime ReportedAt { get; set; }
    public string ReportedByName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? ResolutionNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
