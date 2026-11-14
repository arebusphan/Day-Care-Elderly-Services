using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.DTOs.IncidentReport;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>Vật tư dùng trong sự cố (trừ kho, tính phí) và ảnh sự cố</summary>
public interface IIncidentOperationsService
{
    Task<ApiResponse<List<IncidentSupplyUsageDto>>> RecordSuppliesAsync(int userId, int incidentId, RecordIncidentSuppliesDto dto);
    Task<ApiResponse<List<IncidentSupplyUsageDto>>> GetSupplyUsageAsync(int incidentId);
    Task<ApiResponse<List<string>>> AddPhotosAsync(int userId, int incidentId, List<PhotoUploadFile> files);
}
