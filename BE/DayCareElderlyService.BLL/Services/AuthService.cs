using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Auth;
using DayCareElderlyService.BLL.Security;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Services;

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;

    public AuthService(
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        ITokenService tokenService)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
    }

    public async Task<ApiResponse<AuthResponseDto>> RegisterAsync(RegisterRequestDto request)
    {
        var email = request.Email.Trim().ToLower();

        if (await _unitOfWork.Users.EmailExistsAsync(email))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email đã được đăng ký trong hệ thống.");
        }

        var defaultRole = await _unitOfWork.Roles.GetByNameAsync("FamilyMember");
        if (defaultRole == null)
        {
            defaultRole = new Role
            {
                RoleName = "FamilyMember",
                Description = "Thành viên gia đình của người cao tuổi"
            };
            await _unitOfWork.Roles.AddAsync(defaultRole);
            await _unitOfWork.SaveChangesAsync();
        }

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Email = email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Roles = new List<Role> { defaultRole }
        };

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresAt = expiresAt,
            User = MapToUserDto(user)
        };

        return ApiResponse<AuthResponseDto>.Ok(response, "Đăng ký tài khoản thành công.");
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request)
    {
        var email = request.Email.Trim().ToLower();
        var user = await _unitOfWork.Users.GetByEmailWithRolesAsync(email);

        if (user == null || !_passwordHasher.VerifyPassword(user.PasswordHash, request.Password))
        {
            return ApiResponse<AuthResponseDto>.Fail("Email hoặc mật khẩu không chính xác.");
        }

        if (!user.IsActive)
        {
            return ApiResponse<AuthResponseDto>.Fail("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.");
        }

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            TokenType = "Bearer",
            ExpiresAt = expiresAt,
            User = MapToUserDto(user)
        };

        return ApiResponse<AuthResponseDto>.Ok(response, "Đăng nhập thành công.");
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdWithRolesAsync(userId);
        if (user == null)
        {
            return ApiResponse<UserDto>.Fail("Không tìm thấy thông tin người dùng.");
        }

        return ApiResponse<UserDto>.Ok(MapToUserDto(user));
    }

    public async Task<ApiResponse> ChangePasswordAsync(Guid userId, ChangePasswordDto request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
        {
            return ApiResponse.Fail("Không tìm thấy người dùng.");
        }

        if (!_passwordHasher.VerifyPassword(user.PasswordHash, request.CurrentPassword))
        {
            return ApiResponse.Fail("Mật khẩu hiện tại không chính xác.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse.Ok("Đổi mật khẩu thành công.");
    }

    private static UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            UserId = user.UserId,
            Email = user.Email,
            FullName = user.FullName,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = user.Roles?.Select(r => r.RoleName).ToList() ?? new List<string>()
        };
    }
}
