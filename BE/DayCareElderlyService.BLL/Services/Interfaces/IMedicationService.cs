using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Medication;

namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Kế hoạch thuốc và tạo lịch liều cho staff
/// </summary>
public interface IMedicationService
{
    Task<ApiResponse<MedicationPlanDto>> CreatePlanAsync(int userId, int elderlyId, CreateMedicationPlanDto dto);
    Task<ApiResponse<List<MedicationPlanDto>>> GetPlansAsync(int userId, int elderlyId, bool? activeOnly);
    Task<ApiResponse<MedicationPlanDto>> UpdatePlanAsync(int userId, int planId, UpdateMedicationPlanDto dto);
    Task<ApiResponse<GenerateDosesResultDto>> GenerateDosesAsync(int userId, int planId, GenerateDosesDto dto);
}
