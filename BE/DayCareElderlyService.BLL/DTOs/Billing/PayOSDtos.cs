using System;
using System.Collections.Generic;

namespace DayCareElderlyService.BLL.DTOs.Billing;

public class PayOSSettings
{
    public const string SectionName = "PayOS";
    public string ClientId { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ChecksumKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api-merchant.payos.vn";
}

public class PayOSItemDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public long Price { get; set; }
}

public class PayOSCreateLinkResponseData
{
    public string Bin { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public long Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public long OrderCode { get; set; }
    public string Currency { get; set; } = "VND";
    public string PaymentLinkId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;
}

public class PayOSPaymentInfoData
{
    public string Id { get; set; } = string.Empty;
    public long OrderCode { get; set; }
    public long Amount { get; set; }
    public long AmountPaid { get; set; }
    public long AmountRemaining { get; set; }
    public string Status { get; set; } = string.Empty; // PENDING, PAID, CANCELLED, EXPIRED
    public string? CreatedAt { get; set; }
    public string? CancellationReason { get; set; }
    public string? CanceledAt { get; set; }
}

public class CreatePayOSRegistrationDto : CreateServiceRegistrationDto
{
    public string? ReturnUrl { get; set; }
    public string? CancelUrl { get; set; }
}

public class PayOSRegistrationResultDto
{
    public int RegistrationId { get; set; }
    public string RegistrationCode { get; set; } = string.Empty;
    public int PaymentId { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string InvoiceVatNo { get; set; } = string.Empty;
    public long OrderCode { get; set; }
    public long Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string CheckoutUrl { get; set; } = string.Empty;
    public string QrCode { get; set; } = string.Empty;
    public string PaymentLinkId { get; set; } = string.Empty;
    public string Bin { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING";
    public DateTime CreatedAt { get; set; }
}

public class PayOSStatusResultDto
{
    public long OrderCode { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, PAID, CANCELLED, EXPIRED
    public string RegistrationCode { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public DateTime? PaidAt { get; set; }
}

