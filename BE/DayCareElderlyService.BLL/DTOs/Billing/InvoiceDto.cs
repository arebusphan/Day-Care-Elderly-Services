using System;

namespace DayCareElderlyService.BLL.DTOs.Billing;

public class InvoiceDto
{
    public string Id { get; set; } = string.Empty; // InvoiceNo (e.g., HD-20261023-1234)
    public string RegistrationCode { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty; // formatted dd/MM/yyyy HH:mm
    public string ElderlyName { get; set; } = string.Empty;
    public string Relationship { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string ServiceTypeLabel { get; set; } = string.Empty;
    public string RoomTypeLabel { get; set; } = string.Empty;
    public int TotalDays { get; set; }
    public string DatesDescription { get; set; } = string.Empty;
    public decimal PackagePrice { get; set; }
    public decimal SupportSurcharge { get; set; }
    public decimal RoomSurcharge { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "paid"; // "paid" | "pending" | "refunded"
    public string PaymentMethod { get; set; } = "Chuyển khoản";
    public string? InvoiceVatNo { get; set; }
}
