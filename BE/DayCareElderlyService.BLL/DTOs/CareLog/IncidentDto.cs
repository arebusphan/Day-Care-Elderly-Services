namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Sự cố / cảnh báo (1 dòng IncidentReports)
/// </summary>
public class IncidentDto
{
    public int IncidentId { get; set; }
    public int ElderlyId { get; set; }
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

    public string? HandlingActions { get; set; }
    public string? HospitalName { get; set; }
    public DateTime? HospitalTransferAt { get; set; }
    /// <summary>Phí vật tư tính riêng cho gia đình (F-14)</summary>
    public decimal SupplyChargeAmount { get; set; }
}
