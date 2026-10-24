using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Notification;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<NotificationListDto>> GetMyNotificationsAsync(Guid userId, bool unreadOnly, int take)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);
        if (unreadOnly)
        {
            query = query.Where(n => !n.IsRead);
        }

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(Math.Clamp(take, 1, 100))
            .Select(n => new NotificationDto
            {
                NotificationId = n.NotificationId,
                Title = n.Title,
                Message = n.Message,
                NotificationType = n.NotificationType,
                RelatedEntityType = n.RelatedEntityType,
                RelatedEntityId = n.RelatedEntityId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();

        var unreadCount = await _context.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead);

        var result = new NotificationListDto { UnreadCount = unreadCount, Items = items };
        return ApiResponse<NotificationListDto>.Ok(result, "Lấy danh sách thông báo thành công.");
    }

    public async Task<ApiResponse<NotificationDto>> MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);
        if (notification == null)
        {
            return ApiResponse<NotificationDto>.Fail("Không tìm thấy thông báo.");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        var dto = new NotificationDto
        {
            NotificationId = notification.NotificationId,
            Title = notification.Title,
            Message = notification.Message,
            NotificationType = notification.NotificationType,
            RelatedEntityType = notification.RelatedEntityType,
            RelatedEntityId = notification.RelatedEntityId,
            IsRead = notification.IsRead,
            CreatedAt = notification.CreatedAt
        };
        return ApiResponse<NotificationDto>.Ok(dto, "Đã đánh dấu đã đọc.");
    }

    public async Task<ApiResponse<int>> MarkAllAsReadAsync(Guid userId)
    {
        var count = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        return ApiResponse<int>.Ok(count, $"Đã đánh dấu {count} thông báo là đã đọc.");
    }
}
