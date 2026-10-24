using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Nhận xử lý (InProgress) hoặc đóng (Resolved) sự cố
/// </summary>
public class UpdateIncidentDto
{
    [Required(ErrorMessage = "Vui lòng chọn trạng thái: InProgress hoặc Resolved.")]
    public string Status { get; set; } = string.Empty;

    /// <summary>Bắt buộc khi Resolved</summary>
    [StringLength(1000, ErrorMessage = "Kết quả xử lý tối đa 1000 ký tự.")]
    public string? ResolutionNotes { get; set; }
}
