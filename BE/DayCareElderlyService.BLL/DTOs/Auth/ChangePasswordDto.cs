using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Auth;

public class ChangePasswordDto
{
    [Required(ErrorMessage = "Mật khẩu hiện tại là bắt buộc.")]
    public string CurrentPassword { get; set; } = null!;

    [Required(ErrorMessage = "Mật khẩu mới là bắt buộc.")]
    [MinLength(8, ErrorMessage = "Mật khẩu mới phải có ít nhất 8 ký tự.")]
    [RegularExpression(@"^(?=.*[A-Za-z])(?=.*[0-9]).+$", ErrorMessage = "Mật khẩu mới phải có cả chữ và số.")]
    public string NewPassword { get; set; } = null!;

    [Compare("NewPassword", ErrorMessage = "Xác nhận mật khẩu mới không khớp.")]
    public string? ConfirmNewPassword { get; set; }
}
