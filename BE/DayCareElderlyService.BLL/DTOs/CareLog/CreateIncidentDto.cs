using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Báo sự cố. IncidentType = STROKE (nghi tái phát) hoặc LOST (mất dấu cụ) luôn ở mức Critical.
/// </summary>
public class CreateIncidentDto
{
    [Required(ErrorMessage = "Vui lòng chọn người cao tuổi.")]
    public Guid ElderlyId { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập loại sự cố.")]
    [StringLength(100, ErrorMessage = "Loại sự cố tối đa 100 ký tự.")]
    public string IncidentType { get; set; } = string.Empty;

    /// <summary>Low / Medium / High / Critical (mặc định Medium)</summary>
    public string? Severity { get; set; }

    [Required(ErrorMessage = "Mô tả sự cố không được để trống.")]
    [StringLength(2000, ErrorMessage = "Mô tả tối đa 2000 ký tự.")]
    public string Description { get; set; } = string.Empty;

    /// <summary>Thời điểm xảy ra (giờ VN); bỏ trống = bây giờ</summary>
    public DateTime? OccurredAt { get; set; }
}
