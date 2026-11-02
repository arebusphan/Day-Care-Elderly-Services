namespace DayCareElderlyService.BLL.DTOs.IncidentReport;

public class IncidentReportFilterDto
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
    public string? Severity { get; set; }
    public int? ElderlyId { get; set; }
    public int? CenterId { get; set; }
    public bool? IsSupplyConfirmed { get; set; }
    public string? Search { get; set; }
}
