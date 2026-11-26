using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.DTOs.Billing;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.Extensions.Configuration;

namespace DayCareElderlyService.BLL.Services;

public class PayOSService : IPayOSService
{
    private readonly HttpClient _httpClient;
    private readonly PayOSSettings _settings;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public PayOSService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _settings = configuration.GetSection(PayOSSettings.SectionName).Get<PayOSSettings>() ?? new PayOSSettings();

        var baseUrl = string.IsNullOrWhiteSpace(_settings.BaseUrl)
            ? "https://api-merchant.payos.vn"
            : _settings.BaseUrl.TrimEnd('/');
        _httpClient.BaseAddress = new Uri(baseUrl + "/");
    }

    public async Task<PayOSCreateLinkResponseData> CreatePaymentLinkAsync(
        long orderCode,
        long amount,
        string description,
        string returnUrl,
        string cancelUrl,
        List<PayOSItemDto> items,
        long? expiredAt = null)
    {
        EnsureConfigured();

        var rawSignature =
            $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}";
        var signature = ComputeHmacSha256(rawSignature, _settings.ChecksumKey);

        var payload = new Dictionary<string, object?>
        {
            ["orderCode"] = orderCode,
            ["amount"] = amount,
            ["description"] = description,
            ["items"] = items,
            ["cancelUrl"] = cancelUrl,
            ["returnUrl"] = returnUrl,
            ["signature"] = signature
        };
        if (expiredAt.HasValue)
        {
            payload["expiredAt"] = expiredAt.Value;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "v2/payment-requests");
        AddAuthHeaders(request);
        request.Content = JsonContent.Create(payload, options: JsonOptions);

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var code = root.TryGetProperty("code", out var c) ? c.GetString() : null;
        var desc = root.TryGetProperty("desc", out var d) ? d.GetString() : body;

        if (!response.IsSuccessStatusCode || code != "00")
        {
            throw new InvalidOperationException($"PayOS trả về lỗi ({code ?? response.StatusCode.ToString()}): {desc}");
        }

        var dataEl = root.GetProperty("data");
        return JsonSerializer.Deserialize<PayOSCreateLinkResponseData>(dataEl.GetRawText(), JsonOptions)
            ?? throw new InvalidOperationException("Không thể đọc dữ liệu phản hồi từ PayOS.");
    }

    public async Task<PayOSPaymentInfoData> GetPaymentInfoAsync(long orderCode)
    {
        EnsureConfigured();

        using var request = new HttpRequestMessage(HttpMethod.Get, $"v2/payment-requests/{orderCode}");
        AddAuthHeaders(request);

        using var response = await _httpClient.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var code = root.TryGetProperty("code", out var c) ? c.GetString() : null;
        var desc = root.TryGetProperty("desc", out var d) ? d.GetString() : body;

        if (!response.IsSuccessStatusCode || code != "00")
        {
            throw new InvalidOperationException($"PayOS không lấy được trạng thái giao dịch ({code ?? response.StatusCode.ToString()}): {desc}");
        }

        var dataEl = root.GetProperty("data");
        return JsonSerializer.Deserialize<PayOSPaymentInfoData>(dataEl.GetRawText(), JsonOptions)
            ?? throw new InvalidOperationException("Không thể đọc trạng thái giao dịch từ PayOS.");
    }

    public async Task CancelPaymentLinkAsync(long orderCode, string? cancellationReason = null)
    {
        EnsureConfigured();

        using var request = new HttpRequestMessage(HttpMethod.Post, $"v2/payment-requests/{orderCode}/cancel");
        AddAuthHeaders(request);
        request.Content = JsonContent.Create(new
        {
            cancellationReason = string.IsNullOrWhiteSpace(cancellationReason) ? "Người dùng hủy thanh toán" : cancellationReason
        }, options: JsonOptions);

        using var response = await _httpClient.SendAsync(request);
        // Best effort: PayOS may return non-00 if already paid/cancelled
    }

    public bool VerifyWebhookSignature(JsonElement dataElement, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature) || dataElement.ValueKind != JsonValueKind.Object)
            return false;

        var pairs = dataElement.EnumerateObject()
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => $"{p.Name}={FormatJsonValue(p.Value)}");

        var rawData = string.Join("&", pairs);
        var computed = ComputeHmacSha256(rawData, _settings.ChecksumKey);
        return string.Equals(computed, signature, StringComparison.OrdinalIgnoreCase);
    }

    private void AddAuthHeaders(HttpRequestMessage request)
    {
        request.Headers.Add("x-client-id", _settings.ClientId);
        request.Headers.Add("x-api-key", _settings.ApiKey);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.ClientId)
            || string.IsNullOrWhiteSpace(_settings.ApiKey)
            || string.IsNullOrWhiteSpace(_settings.ChecksumKey))
        {
            throw new InvalidOperationException("Chưa cấu hình đầy đủ thông tin PayOS (ClientId, ApiKey, ChecksumKey).");
        }
    }

    private static string FormatJsonValue(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => string.Empty,
        JsonValueKind.String => el.GetString() ?? string.Empty,
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        JsonValueKind.Array or JsonValueKind.Object => el.GetRawText(),
        _ => el.GetRawText()
    };

    private static string ComputeHmacSha256(string data, string key)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(dataBytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}

