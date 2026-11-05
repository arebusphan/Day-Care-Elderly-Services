namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Tạo thông báo đến giờ uống thuốc cho staff được phân công
/// </summary>
public interface IMedicationReminderService
{
    /// <summary>Trả về số thông báo vừa tạo.</summary>
    Task<int> ProcessDueDosesAsync(CancellationToken cancellationToken = default);
}
