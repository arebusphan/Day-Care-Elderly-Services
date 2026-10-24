namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Care log 1 ngày của 1 cụ: trạng thái ngày + danh sách mục theo giờ
/// </summary>
public class CareLogDayDto
{
    public Guid ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public bool IsMedicalDone { get; set; }
    public DateTime? MedicalDoneAt { get; set; }
    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? ClosedBy { get; set; }
    public List<CareLogEntryDto> Entries { get; set; } = new();
}
