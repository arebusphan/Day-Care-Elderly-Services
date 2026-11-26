using System.Text.Json;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/payos")]
[AllowAnonymous]
public class PayOSWebhookController : ControllerBase
{
    private readonly IPayOSService _payOSService;
    private readonly IBillingService _billingService;
    private readonly ILogger<PayOSWebhookController> _logger;

    public PayOSWebhookController(
        IPayOSService payOSService,
        IBillingService billingService,
        ILogger<PayOSWebhookController> logger)
    {
        _payOSService = payOSService;
        _billingService = billingService;
        _logger = logger;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] JsonElement payload)
    {
        try
        {
            if (!payload.TryGetProperty("data", out var dataEl) ||
                !payload.TryGetProperty("signature", out var sigEl))
            {
                return Ok(new { error = 0, message = "Ignored" });
            }

            var signature = sigEl.GetString() ?? string.Empty;
            if (!_payOSService.VerifyWebhookSignature(dataEl, signature))
            {
                _logger.LogWarning("PayOS webhook signature không hợp lệ.");
                return BadRequest(new { error = -1, message = "Invalid signature" });
            }

            var code = payload.TryGetProperty("code", out var codeEl) ? codeEl.GetString() : null;
            var success = payload.TryGetProperty("success", out var succEl) && succEl.ValueKind == JsonValueKind.True;

            if (dataEl.TryGetProperty("orderCode", out var orderCodeEl) && orderCodeEl.TryGetInt64(out var orderCode))
            {
                var isPaid = code == "00" && success;
                await _billingService.HandlePayOSWebhookAsync(orderCode, isPaid);
            }

            return Ok(new { error = 0, message = "Ok" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi xử lý webhook PayOS");
            return Ok(new { error = 0, message = "Handled" });
        }
    }
}

