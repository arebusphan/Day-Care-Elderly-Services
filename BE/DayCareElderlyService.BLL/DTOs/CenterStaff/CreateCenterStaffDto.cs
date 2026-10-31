using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CenterStaff;

public class CreateCenterStaffDto
{
    [Required(ErrorMessage = "Họ và tên nhân viên là bắt buộc.")]
    [StringLength(150, ErrorMessage = "Họ tên không được vượt quá 150 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    [StringLength(256, ErrorMessage = "Email không được vượt quá 256 ký tự.")]
    public string Email { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng.")]
    [StringLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự.")]
    public string? PhoneNumber { get; set; }

    [Required(ErrorMessage = "Mật khẩu tạm là bắt buộc.")]
    [MinLength(6, ErrorMessage = "Mật khẩu tạm phải có ít nhất 6 ký tự.")]
    public string TemporaryPassword { get; set; } = string.Empty;
}
