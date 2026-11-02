using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IMedicalSupplyService
{
    Task<ApiResponse<MedicalSupplyDto>> CreateMedicalSupplyAsync(CreateMedicalSupplyDto dto);
    Task<ApiResponse<PagedResult<MedicalSupplyDto>>> GetMedicalSuppliesPagedAsync(MedicalSupplyFilterDto filter);
    Task<ApiResponse<MedicalSupplyDto>> GetMedicalSupplyByIdAsync(int supplyId);
    Task<ApiResponse<MedicalSupplyDto>> UpdateMedicalSupplyAsync(int supplyId, UpdateMedicalSupplyDto dto);
    Task<ApiResponse<MedicalSupplyDto>> AdjustStockAsync(int supplyId, AdjustStockDto dto);
    Task<ApiResponse<MedicalSupplyDto>> ToggleStatusAsync(int supplyId);
}
