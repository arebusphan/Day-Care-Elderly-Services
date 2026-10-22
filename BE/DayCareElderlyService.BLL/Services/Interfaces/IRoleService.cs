using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Admin.Role;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IRoleService
{
    Task<ApiResponse<IEnumerable<RoleDto>>> GetAllRolesAsync();
    Task<ApiResponse<RoleDto>> GetRoleByIdAsync(int roleId);
    Task<ApiResponse<RoleDto>> CreateRoleAsync(CreateRoleDto dto);
    Task<ApiResponse<RoleDto>> UpdateRoleAsync(int roleId, UpdateRoleDto dto);
    Task<ApiResponse> DeleteRoleAsync(int roleId);
}
