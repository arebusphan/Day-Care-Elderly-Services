using DayCareElderlyService.BLL.Services.Interfaces;

namespace DayCareElderlyService.API.Background;

/// <summary>
/// Quét liều thuốc đến hạn và tạo Notification cho staff (mỗi phút).
/// </summary>
public class MedicationReminderHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MedicationReminderHostedService> _logger;

    public MedicationReminderHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<MedicationReminderHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Chờ app khởi động xong trước khi quét lần đầu.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var reminder = scope.ServiceProvider.GetRequiredService<IMedicationReminderService>();
                var created = await reminder.ProcessDueDosesAsync(stoppingToken);
                if (created > 0)
                {
                    _logger.LogInformation("Medication reminder: đã tạo {Count} thông báo.", created);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gửi nhắc uống thuốc.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
