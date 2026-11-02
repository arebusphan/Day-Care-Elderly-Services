namespace DayCareElderlyService.BLL.DTOs.MedicalSupply;

public class MedicalSupplyFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public int? CenterId { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsLowStock { get; set; }
    public string? Search { get; set; }
}
