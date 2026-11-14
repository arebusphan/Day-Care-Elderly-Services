using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

/// <summary>Vật tư đã dùng khi xử lý sự cố (F-14 / WF-05)</summary>
public class RecordIncidentSuppliesDto
{
    [Required, MinLength(1, ErrorMessage = "Chọn ít nhất một vật tư.")]
    public List<IncidentSupplyItemDto> Items { get; set; } = new();

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Notes { get; set; }
}

public class IncidentSupplyItemDto
{
    [Required]
    public int SupplyId { get; set; }

    [Range(0.01, 100000, ErrorMessage = "Số lượng phải lớn hơn 0.")]
    public decimal Quantity { get; set; }
}

public class IncidentSupplyUsageDto
{
    public int SupplyTransactionId { get; set; }
    public int SupplyId { get; set; }
    public string SupplyName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Amount { get; set; }
    public DateTime OccurredAt { get; set; }
    public string RecordedByName { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
