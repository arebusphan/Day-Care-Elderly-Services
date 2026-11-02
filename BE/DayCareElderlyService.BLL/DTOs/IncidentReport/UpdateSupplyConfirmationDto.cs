using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class UpdateSupplyConfirmationDto
{
    [Required(ErrorMessage = "Vui lòng chọn trạng thái xác nhận vật tư.")]
    public bool IsSupplyConfirmed { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú tối đa 500 ký tự.")]
    public string? Notes { get; set; }
}
