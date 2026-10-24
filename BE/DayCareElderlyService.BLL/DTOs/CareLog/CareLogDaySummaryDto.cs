namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Tóm tắt 1 ngày trong lịch sử care log
/// </summary>
public class CareLogDaySummaryDto
{
    public DateOnly Date { get; set; }
    public int EntryCount { get; set; }
    public bool IsMedicalDone { get; set; }
    public bool IsClosed { get; set; }
    public DateTime LastRecordedAt { get; set; }
}
