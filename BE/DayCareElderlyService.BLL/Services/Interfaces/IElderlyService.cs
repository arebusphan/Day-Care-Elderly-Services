using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Elderly;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IElderlyService
{
    Task<ApiResponse<ElderlyProfileDto>> CreateElderlyProfileAsync(int userId, CreateElderlyProfileDto dto);
    Task<ApiResponse<List<ElderlyProfileDto>>> GetMyElderlyProfilesAsync(int userId);
    Task<ApiResponse<ElderlyProfileDto>> GetElderlyProfileByIdAsync(int userId, int elderlyId);
    Task<ApiResponse<ElderlyProfileDto>> UpdateElderlyProfileAsync(int userId, int elderlyId, UpdateElderlyProfileDto dto);
    Task<ApiResponse<bool>> DeleteElderlyProfileAsync(int userId, int elderlyId);
}
