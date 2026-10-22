namespace DayCareElderlyService.BLL.DTOs.Admin.User;

public class UserFilterDto
{
    public string? Search { get; set; }
    public string? RoleName { get; set; }
    public bool? IsActive { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
