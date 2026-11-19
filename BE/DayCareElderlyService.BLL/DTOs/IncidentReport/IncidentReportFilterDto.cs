using System;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class IncidentReportFilterDto
{
    [Range(1, int.MaxValue, ErrorMessage = "PageNumber phải lớn hơn hoặc bằng 1.")]
    public int PageNumber { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "PageSize phải từ 1 đến 100.")]
    public int PageSize { get; set; } = 10;

    [StringLength(50, ErrorMessage = "Trạng thái tối đa 50 ký tự.")]
    public string? Status { get; set; }

    [StringLength(50, ErrorMessage = "Mức độ nghiêm trọng tối đa 50 ký tự.")]
    public string? Severity { get; set; }

    public int? ElderlyId { get; set; }
    public int? CenterId { get; set; }
    public bool? IsSupplyConfirmed { get; set; }

    [StringLength(200, ErrorMessage = "Từ khóa tìm kiếm tối đa 200 ký tự.")]
    public string? Search { get; set; }

    /// <summary>Lọc sự cố xảy ra từ ngày</summary>
    public DateTime? FromDate { get; set; }

    /// <summary>Lọc sự cố xảy ra đến ngày</summary>
    public DateTime? ToDate { get; set; }
}
