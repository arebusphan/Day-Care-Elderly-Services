using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Auth;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    [StringLength(256)]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
    [StringLength(100)]
    public string Password { get; set; } = null!;

    [Compare("Password", ErrorMessage = "Xác nhận mật khẩu không khớp.")]
    public string? ConfirmPassword { get; set; }

    [Required(ErrorMessage = "Họ và tên là bắt buộc.")]
    [StringLength(150)]
    public string FullName { get; set; } = null!;

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng.")]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }
}
