using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class MedicalSupply
{
    public Guid SupplyId { get; set; }

    public Guid CenterId { get; set; }

    public string SupplyName { get; set; } = null!;

    public string Unit { get; set; } = null!;

    public decimal MinimumStock { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Center Center { get; set; } = null!;

    public virtual ICollection<SupplyTransaction> SupplyTransactions { get; set; } = new List<SupplyTransaction>();
}
