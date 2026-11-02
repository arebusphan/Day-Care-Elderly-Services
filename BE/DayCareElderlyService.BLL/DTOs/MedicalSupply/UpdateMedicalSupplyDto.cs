using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

public class UpdateMedicalSupplyDto
{
    [Required(ErrorMessage = "Tên vật tư không được để trống.")]
    [StringLength(200, ErrorMessage = "Tên vật tư tối đa 200 ký tự.")]
    public string SupplyName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Đơn vị tính không được để trống.")]
    [StringLength(50, ErrorMessage = "Đơn vị tính tối đa 50 ký tự.")]
    public string Unit { get; set; } = string.Empty;

    [Range(0, (double)decimal.MaxValue, ErrorMessage = "Mức tồn kho tối thiểu phải lớn hơn hoặc bằng 0.")]
    public decimal MinimumStock { get; set; }
}
