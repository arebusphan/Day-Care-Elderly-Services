using System;

namespace DayCareElderlyService.BLL.DTOs.Billing;

public class ServiceRegistrationResultDto
{
    public Guid RegistrationId { get; set; }
    public string RegistrationCode { get; set; } = string.Empty;
    public Guid PaymentId { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string InvoiceVatNo { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Confirmed";
    public DateTime CreatedAt { get; set; }
}
