using System;

namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

public class MedicalSupplyDto
{
    public int SupplyId { get; set; }
    public int CenterId { get; set; }
    public string CenterName { get; set; } = string.Empty;
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal MinimumStock { get; set; }
    public decimal QuantityInStock { get; set; }
    public bool IsLowStock => QuantityInStock <= MinimumStock;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
