using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Admin.User;

public class CreateUserAdminDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    [StringLength(256)]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
    public string Password { get; set; } = null!;

    [Required(ErrorMessage = "Họ và tên là bắt buộc.")]
    [StringLength(150)]
    public string FullName { get; set; } = null!;

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng.")]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Danh sách tên các quyền được gán (ví dụ: ["Admin"], ["Staff"], ["FamilyMember"])
    /// </summary>
    public List<string> Roles { get; set; } = new();
}
