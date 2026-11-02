using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.IncidentReport;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IIncidentReportService
{
    Task<ApiResponse<IncidentReportDto>> CreateIncidentAsync(int userId, CreateIncidentReportDto dto);
    Task<ApiResponse<PagedResult<IncidentReportDto>>> GetIncidentsPagedAsync(IncidentReportFilterDto filter);
    Task<ApiResponse<IncidentReportDto>> GetIncidentByIdAsync(int incidentId);
    Task<ApiResponse<IncidentReportDto>> UpdateIncidentAsync(int incidentId, UpdateIncidentReportDto dto);
    Task<ApiResponse<IncidentReportDto>> UpdateIncidentStatusAsync(int incidentId, UpdateIncidentStatusDto dto);
    Task<ApiResponse<IncidentReportDto>> UpdateSupplyConfirmationAsync(int incidentId, UpdateSupplyConfirmationDto dto);
    Task<ApiResponse<bool>> DeleteIncidentAsync(int incidentId);
}
