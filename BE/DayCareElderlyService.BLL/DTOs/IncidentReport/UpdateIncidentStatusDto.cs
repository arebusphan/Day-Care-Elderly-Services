using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class UpdateIncidentStatusDto
{
    [Required(ErrorMessage = "Vui lòng nhập trạng thái sự cố.")]
    public string Status { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Ghi chú xử lý tối đa 1000 ký tự.")]
    public string? ResolutionNotes { get; set; }
}
