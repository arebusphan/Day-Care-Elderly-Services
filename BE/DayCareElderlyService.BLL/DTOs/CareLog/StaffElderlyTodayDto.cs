namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Cụ có mặt hôm nay trong danh sách của staff
/// </summary>
public class StaffElderlyTodayDto
{
    public Guid ElderlyId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? MobilityStatus { get; set; }
    public string? Allergies { get; set; }
    public DateTime? CheckInAt { get; set; }
    public DateTime? CheckOutAt { get; set; }
    public int EntryCount { get; set; }
    public DateTime? LastRecordedAt { get; set; }
    public bool IsMedicalDone { get; set; }
    public bool IsClosed { get; set; }
}
