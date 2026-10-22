using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Elderly;

public class CreateElderlyProfileDto
{
    // 1. Thông tin cá nhân
    [Required(ErrorMessage = "Họ và tên người cao tuổi không được để trống.")]
    [StringLength(150, ErrorMessage = "Họ và tên tối đa 150 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Ngày sinh không được để trống.")]
    public DateOnly? DateOfBirth { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn giới tính.")]
    public string Gender { get; set; } = "Nam";

    [Required(ErrorMessage = "Vui lòng nhập mối quan hệ (Bố, Mẹ, Ông, Bà,...).")]
    public string Relationship { get; set; } = string.Empty;

    [Required(ErrorMessage = "Tên người liên hệ không được để trống.")]
    [StringLength(100, ErrorMessage = "Tên người liên hệ tối đa 100 ký tự.")]
    public string EmergencyContactName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Số điện thoại người liên hệ không được để trống.")]
    [RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại không hợp lệ (gồm 10-11 số bắt đầu từ số 0).")]
    public string EmergencyContactPhone { get; set; } = string.Empty;

    public string? Address { get; set; }

    // 2. Thông tin sức khỏe
    public string? Allergies { get; set; }

    public string? MedicalHistory { get; set; }

    public string? MedicalNotes { get; set; }

    // 3. Thông tin chăm sóc
    [Required(ErrorMessage = "Vui lòng chọn khả năng di chuyển (Bình thường hoặc Cần hỗ trợ).")]
    public string MobilityStatus { get; set; } = "Bình thường"; // "Bình thường" | "Cần hỗ trợ"

    public string? CareNotes { get; set; }
}
