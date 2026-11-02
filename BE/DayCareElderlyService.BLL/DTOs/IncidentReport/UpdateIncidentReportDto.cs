using System;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class UpdateIncidentReportDto
{
    [Required(ErrorMessage = "Vui lòng nhập loại sự cố.")]
    [StringLength(100, ErrorMessage = "Loại sự cố tối đa 100 ký tự.")]
    public string IncidentType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng chọn mức độ nghiêm trọng.")]
    public string Severity { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mô tả sự cố không được để trống.")]
    [StringLength(2000, ErrorMessage = "Mô tả sự cố tối đa 2000 ký tự.")]
    public string Description { get; set; } = string.Empty;

    public DateTime? OccurredAt { get; set; }

    [StringLength(1000, ErrorMessage = "Ghi chú xử lý tối đa 1000 ký tự.")]
    public string? ResolutionNotes { get; set; }
}
