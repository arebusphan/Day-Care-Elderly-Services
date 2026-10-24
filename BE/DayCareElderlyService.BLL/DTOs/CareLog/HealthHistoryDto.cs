namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Lịch sử sức khỏe cho gia đình: các lần đo chỉ số + các liều thuốc
/// </summary>
public class HealthHistoryDto
{
    public Guid ElderlyId { get; set; }
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public List<CareLogEntryDto> Vitals { get; set; } = new();
    public List<DoseDto> Doses { get; set; } = new();
}
