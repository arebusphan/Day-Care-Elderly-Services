using System;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class CreateIncidentReportDto
{
    [Required(ErrorMessage = "Vui lòng chọn người cao tuổi.")]
    public int ElderlyId { get; set; }

    public int? CenterId { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập loại sự cố.")]
    [StringLength(100, ErrorMessage = "Loại sự cố tối đa 100 ký tự.")]
    public string IncidentType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng chọn mức độ nghiêm trọng.")]
    public string Severity { get; set; } = "Medium";

    [Required(ErrorMessage = "Mô tả sự cố không được để trống.")]
    [StringLength(2000, ErrorMessage = "Mô tả sự cố tối đa 2000 ký tự.")]
    public string Description { get; set; } = string.Empty;

    public DateTime? OccurredAt { get; set; }
}
