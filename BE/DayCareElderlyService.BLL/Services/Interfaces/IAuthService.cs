using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Auth;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request);
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId);
    Task<ApiResponse> ChangePasswordAsync(Guid userId, ChangePasswordDto request);
}
