namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IMedicationReminderService
{
    Task<int> ProcessDueDosesAsync(CancellationToken cancellationToken = default);
}
