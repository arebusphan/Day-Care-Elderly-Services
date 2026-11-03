namespace DayCareElderlyService.Models.Entities;

public partial class Invoice
{
    public int InvoiceId { get; set; }

    public int RegistrationId { get; set; }

    public string InvoiceNo { get; set; } = null!;

    public string? InvoiceVatNo { get; set; }

    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Pending";

    public DateTime IssuedAt { get; set; }

    public DateTime? DueAt { get; set; }

    public virtual ServiceRegistration Registration { get; set; } = null!;

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
