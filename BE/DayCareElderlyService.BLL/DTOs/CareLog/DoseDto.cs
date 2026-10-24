namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Một liều thuốc (1 dòng MedicationRecords)
/// </summary>
public class DoseDto
{
    public Guid MedicationRecordId { get; set; }
    public Guid MedicationPlanId { get; set; }
    public Guid ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string StatusLabel { get; set; } = string.Empty;
    public DateTime? RecordedAt { get; set; }
    public string? Notes { get; set; }
    public string StaffName { get; set; } = string.Empty;
}
