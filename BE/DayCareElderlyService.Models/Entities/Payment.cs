using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class Payment
{
    public int PaymentId { get; set; }

    public int RegistrationId { get; set; }

    public int? InvoiceId { get; set; }

    public decimal Amount { get; set; }

    public string PaymentMethod { get; set; } = null!;

    public string PaymentStatus { get; set; } = null!;

    public string? TransactionReference { get; set; }

    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? InvoiceNo { get; set; }

    public string? InvoiceVatNo { get; set; }

    public virtual ServiceRegistration Registration { get; set; } = null!;

    public virtual Invoice? Invoice { get; set; }
}
