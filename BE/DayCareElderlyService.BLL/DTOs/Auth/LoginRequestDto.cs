using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Auth;

public class LoginRequestDto
{
    [Required(ErrorMessage = "Email là bắt buộc.")]
    [EmailAddress(ErrorMessage = "Email không đúng định dạng.")]
    public string Email { get; set; } = null!;

    [Required(ErrorMessage = "Mật khẩu là bắt buộc.")]
    public string Password { get; set; } = null!;
}
