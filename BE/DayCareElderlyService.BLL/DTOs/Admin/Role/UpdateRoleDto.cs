using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Admin.Role;

public class UpdateRoleDto
{
    [Required(ErrorMessage = "Tên quyền là bắt buộc.")]
    [StringLength(50, ErrorMessage = "Tên quyền tối đa 50 ký tự.")]
    public string RoleName { get; set; } = null!;

    [StringLength(255, ErrorMessage = "Mô tả tối đa 255 ký tự.")]
    public string? Description { get; set; }
}
