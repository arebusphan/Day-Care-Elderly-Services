using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

public class AdjustStockDto
{
    [Required(ErrorMessage = "Vui lòng nhập số lượng điều chỉnh (dương để tăng, âm để giảm).")]
    public decimal AdjustmentQuantity { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Notes { get; set; }
}
