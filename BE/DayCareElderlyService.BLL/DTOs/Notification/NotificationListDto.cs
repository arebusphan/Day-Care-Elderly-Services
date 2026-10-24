namespace DayCareElderlyService.BLL.DTOs.Notification;

/// <summary>
/// Danh sách thông báo + số chưa đọc (cho badge)
/// </summary>
public class NotificationListDto
{
    public int UnreadCount { get; set; }
    public List<NotificationDto> Items { get; set; } = new();
}
