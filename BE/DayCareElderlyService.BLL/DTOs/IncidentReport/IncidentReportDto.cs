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

    // Chi tiết xử lý (SRS 3.9.1, SR-33)
    public int? HandledBy { get; set; }
    public string? HandledByName { get; set; }
    public string? HandlingActions { get; set; }
    public string? HospitalName { get; set; }
    public DateTime? HospitalTransferAt { get; set; }
    public string? HospitalEscort { get; set; }
    public List<string> PhotoUrls { get; set; } = new();

    /// <summary>Tổng phí vật tư tính riêng cho gia đình (F-14)</summary>
    public decimal SupplyChargeAmount { get; set; }
}
