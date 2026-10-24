using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Ghi nhận cho uống thuốc: Given / Refused / Missed
/// </summary>
public class UpdateDoseDto
{
    [Required(ErrorMessage = "Vui lòng chọn trạng thái: Given, Refused hoặc Missed.")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Bắt buộc khi Refused hoặc Missed</summary>
    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }
}
