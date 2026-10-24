namespace DayCareElderlyService.BLL.DTOs.Notification;

/// <summary>
/// Một thông báo (1 dòng Notifications)
/// </summary>
public class NotificationDto
{
    public Guid NotificationId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>CareLog, Vitals, Medication, Incident...</summary>
    public string NotificationType { get; set; } = string.Empty;

    /// <summary>Loại bản ghi liên quan: CareLog, IncidentReport, MedicationRecord</summary>
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
