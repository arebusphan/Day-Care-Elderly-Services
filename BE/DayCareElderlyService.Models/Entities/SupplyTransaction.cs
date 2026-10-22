using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class SupplyTransaction
{
    public Guid SupplyTransactionId { get; set; }

    public Guid SupplyId { get; set; }

    public string TransactionType { get; set; } = null!;

    public decimal Quantity { get; set; }

    public DateTime OccurredAt { get; set; }

    public Guid RecordedBy { get; set; }

    public string? Notes { get; set; }

    public virtual User RecordedByNavigation { get; set; } = null!;

    public virtual MedicalSupply Supply { get; set; } = null!;
}
