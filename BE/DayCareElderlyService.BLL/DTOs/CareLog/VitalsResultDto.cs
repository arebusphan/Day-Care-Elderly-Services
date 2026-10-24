namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Kết quả đo chỉ số: mục đã ghi + cảnh báo nếu vượt ngưỡng
/// </summary>
public class VitalsResultDto
{
    public CareLogEntryDto Entry { get; set; } = new();
    public List<string> Warnings { get; set; } = new();

    /// <summary>null nếu mọi chỉ số trong ngưỡng; Medium / High nếu vượt</summary>
    public string? Severity { get; set; }

    /// <summary>Sự cố VITALS_ALERT được tạo (nếu có)</summary>
    public Guid? IncidentId { get; set; }
}
