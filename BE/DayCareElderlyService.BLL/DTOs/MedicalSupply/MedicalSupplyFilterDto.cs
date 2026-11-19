using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

public class MedicalSupplyFilterDto
{
    [Range(1, int.MaxValue, ErrorMessage = "PageNumber phải lớn hơn hoặc bằng 1.")]
    public int PageNumber { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "PageSize phải từ 1 đến 100.")]
    public int PageSize { get; set; } = 10;

    public int? CenterId { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsLowStock { get; set; }

    [StringLength(200, ErrorMessage = "Từ khóa tìm kiếm tối đa 200 ký tự.")]
    public string? Search { get; set; }
}
