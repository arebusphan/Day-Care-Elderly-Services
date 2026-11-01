using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Admin.User;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IUserService
{
    Task<ApiResponse<PagedResult<UserDetailDto>>> GetUsersPagedAsync(UserFilterDto filter);
    Task<ApiResponse<UserDetailDto>> GetUserByIdAsync(int userId);
    Task<ApiResponse<UserDetailDto>> CreateUserAsync(CreateUserAdminDto dto);
    Task<ApiResponse<UserDetailDto>> UpdateUserAsync(int userId, UpdateUserAdminDto dto);
    Task<ApiResponse> ToggleUserStatusAsync(int userId);
    Task<ApiResponse> DeleteUserAsync(int userId);
    Task<ApiResponse<List<string>>> GetAvailableRolesAsync();
}
