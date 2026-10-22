using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Admin.User;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IUserService
{
    Task<ApiResponse<PagedResult<UserDetailDto>>> GetUsersPagedAsync(UserFilterDto filter);
    Task<ApiResponse<UserDetailDto>> GetUserByIdAsync(Guid userId);
    Task<ApiResponse<UserDetailDto>> CreateUserAsync(CreateUserAdminDto dto);
    Task<ApiResponse<UserDetailDto>> UpdateUserAsync(Guid userId, UpdateUserAdminDto dto);
    Task<ApiResponse> ToggleUserStatusAsync(Guid userId);
    Task<ApiResponse> DeleteUserAsync(Guid userId);
    Task<ApiResponse<List<string>>> GetAvailableRolesAsync();
}
