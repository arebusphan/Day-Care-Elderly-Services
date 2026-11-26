using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.DTOs.Billing;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IPayOSService
{
    Task<PayOSCreateLinkResponseData> CreatePaymentLinkAsync(
        long orderCode,
        long amount,
        string description,
        string returnUrl,
        string cancelUrl,
        List<PayOSItemDto> items,
        long? expiredAt = null);

    Task<PayOSPaymentInfoData> GetPaymentInfoAsync(long orderCode);

    Task CancelPaymentLinkAsync(long orderCode, string? cancellationReason = null);

    bool VerifyWebhookSignature(JsonElement dataElement, string signature);
}

