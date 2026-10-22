using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Admin.User;

public class UpdateUserAdminDto
{
    [Required(ErrorMessage = "Họ và tên là bắt buộc.")]
    [StringLength(150)]
    public string FullName { get; set; } = null!;

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng.")]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Nếu truyền mật khẩu mới thì cập nhật mật khẩu, không truyền thì giữ nguyên
    /// </summary>
    [MinLength(6, ErrorMessage = "Mật khẩu mới nếu nhập phải có ít nhất 6 ký tự.")]
    public string? NewPassword { get; set; }

    /// <summary>
    /// Danh sách tên các quyền được gán
    /// </summary>
    public List<string> Roles { get; set; } = new();
}
