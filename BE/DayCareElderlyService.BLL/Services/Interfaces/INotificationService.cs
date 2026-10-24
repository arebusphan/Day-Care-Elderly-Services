using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Notification;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Thông báo của tài khoản đang đăng nhập (mọi role)
/// </summary>
public interface INotificationService
{
    Task<ApiResponse<NotificationListDto>> GetMyNotificationsAsync(Guid userId, bool unreadOnly, int take);
    Task<ApiResponse<NotificationDto>> MarkAsReadAsync(Guid userId, Guid notificationId);
    Task<ApiResponse<int>> MarkAllAsReadAsync(Guid userId);
}
