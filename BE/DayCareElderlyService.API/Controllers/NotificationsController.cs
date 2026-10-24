using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Notification;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Thông báo của tài khoản đang đăng nhập (gia đình nhận cập nhật care log, cảnh báo, sự cố)
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ILogger<NotificationsController> _logger;

    public NotificationsController(INotificationService notificationService, ILogger<NotificationsController> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// Thông báo mới nhất (mặc định 50, tối đa 100) + số chưa đọc
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<NotificationListDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetMyNotifications([FromQuery] bool unreadOnly = false, [FromQuery] int take = 50) =>
        RunAsync(userId => _notificationService.GetMyNotificationsAsync(userId, unreadOnly, take), "lấy thông báo");

    /// <summary>
    /// Đánh dấu 1 thông báo đã đọc
    /// </summary>
    [HttpPatch("{notificationId:guid}/read")]
    [ProducesResponseType(typeof(ApiResponse<NotificationDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<NotificationDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> MarkAsRead(Guid notificationId) =>
        RunAsync(userId => _notificationService.MarkAsReadAsync(userId, notificationId), "đánh dấu đã đọc");

    /// <summary>
    /// Đánh dấu tất cả thông báo đã đọc, trả về số thông báo vừa đánh dấu
    /// </summary>
    [HttpPost("read-all")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public Task<IActionResult> MarkAllAsRead() =>
        RunAsync(userId => _notificationService.MarkAllAsReadAsync(userId), "đánh dấu tất cả đã đọc");

    private Guid? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirst("nameid")?.Value;

        if (Guid.TryParse(idStr, out var id))
        {
            return id;
        }
        return null;
    }

    private async Task<IActionResult> RunAsync<T>(Func<Guid, Task<ApiResponse<T>>> action, string actionName)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<T>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
            }

            var result = await action(userId.Value);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi {Action}: {Message}", actionName, ex.Message);
            return StatusCode(500, ApiResponse<T>.Fail($"Lỗi máy chủ khi {actionName}."));
        }
    }
}
