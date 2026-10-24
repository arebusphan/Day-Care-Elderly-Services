using System.Text.Json;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Một mục care log (1 dòng CareLogs)
/// </summary>
public class CareLogEntryDto
{
    public Guid CareLogId { get; set; }
    public Guid ElderlyId { get; set; }
    public string CareType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public JsonElement? Data { get; set; }
    public bool IsInternal { get; set; }
    public Guid? CenterActivityId { get; set; }
    public string? ActivityName { get; set; }
    public DateTime RecordedAt { get; set; }
    public Guid StaffId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public List<CareLogPhotoDto> Photos { get; set; } = new();
}
