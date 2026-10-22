using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Elderly;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IElderlyService
{
    Task<ApiResponse<ElderlyProfileDto>> CreateElderlyProfileAsync(Guid userId, CreateElderlyProfileDto dto);
    Task<ApiResponse<List<ElderlyProfileDto>>> GetMyElderlyProfilesAsync(Guid userId);
    Task<ApiResponse<ElderlyProfileDto>> GetElderlyProfileByIdAsync(Guid userId, Guid elderlyId);
    Task<ApiResponse<ElderlyProfileDto>> UpdateElderlyProfileAsync(Guid userId, Guid elderlyId, UpdateElderlyProfileDto dto);
    Task<ApiResponse<bool>> DeleteElderlyProfileAsync(Guid userId, Guid elderlyId);
}
