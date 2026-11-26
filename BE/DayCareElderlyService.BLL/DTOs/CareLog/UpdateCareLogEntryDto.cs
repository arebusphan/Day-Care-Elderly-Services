using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Sửa nội dung 1 mục nhật ký do chính staff ghi trong hôm nay (không đổi loại mục)
/// </summary>
public class UpdateCareLogEntryDto
{
    [Required(ErrorMessage = "Nội dung không được để trống.")]
    [StringLength(1000, ErrorMessage = "Nội dung tối đa 1000 ký tự.")]
    public string Description { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }

    /// <summary>true = mục nội bộ, gia đình không xem được</summary>
    public bool IsInternal { get; set; }
}
