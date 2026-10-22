using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Admin.User;
using DayCareElderlyService.BLL.Security;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;

    public UserService(IUnitOfWork unitOfWork, IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
    }

    public async Task<ApiResponse<PagedResult<UserDetailDto>>> GetUsersPagedAsync(UserFilterDto filter)
    {
        var pageNumber = filter.PageNumber > 0 ? filter.PageNumber : 1;
        var pageSize = filter.PageSize > 0 ? filter.PageSize : 10;

        var (users, totalCount) = await _unitOfWork.Users.GetPagedUsersAsync(
            filter.Search,
            filter.RoleName,
            filter.IsActive,
            pageNumber,
            pageSize
        );

        var dtos = users.Select(MapToDetailDto).ToList();
        var result = new PagedResult<UserDetailDto>(dtos, totalCount, pageNumber, pageSize);

        return ApiResponse<PagedResult<UserDetailDto>>.Ok(result);
    }

    public async Task<ApiResponse<UserDetailDto>> GetUserByIdAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdWithRolesAsync(userId);
        if (user == null)
        {
            return ApiResponse<UserDetailDto>.Fail("Không tìm thấy người dùng.");
        }

        return ApiResponse<UserDetailDto>.Ok(MapToDetailDto(user));
    }

    public async Task<ApiResponse<UserDetailDto>> CreateUserAsync(CreateUserAdminDto dto)
    {
        var email = dto.Email.Trim().ToLower();

        if (await _unitOfWork.Users.EmailExistsAsync(email))
        {
            return ApiResponse<UserDetailDto>.Fail("Email đã được sử dụng bởi tài khoản khác.");
        }

        var user = new User
        {
            UserId = Guid.NewGuid(),
            Email = email,
            PasswordHash = _passwordHasher.HashPassword(dto.Password),
            FullName = dto.FullName.Trim(),
            PhoneNumber = dto.PhoneNumber?.Trim(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            Roles = new List<Role>()
        };

        if (dto.Roles != null && dto.Roles.Count > 0)
        {
            foreach (var roleName in dto.Roles)
            {
                var role = await _unitOfWork.Roles.GetByNameAsync(roleName.Trim());
                if (role != null)
                {
                    user.Roles.Add(role);
                }
            }
        }

        // If no valid roles provided, assign default role
        if (user.Roles.Count == 0)
        {
            var defaultRole = await _unitOfWork.Roles.GetByNameAsync("Staff") ??
                              await _unitOfWork.Roles.GetByNameAsync("FamilyMember");
            if (defaultRole != null)
            {
                user.Roles.Add(defaultRole);
            }
        }

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<UserDetailDto>.Ok(MapToDetailDto(user), "Tạo tài khoản người dùng thành công.");
    }

    public async Task<ApiResponse<UserDetailDto>> UpdateUserAsync(Guid userId, UpdateUserAdminDto dto)
    {
        var user = await _unitOfWork.Users.GetByIdWithRolesAsync(userId);
        if (user == null)
        {
            return ApiResponse<UserDetailDto>.Fail("Không tìm thấy người dùng cần cập nhật.");
        }

        user.FullName = dto.FullName.Trim();
        user.PhoneNumber = dto.PhoneNumber?.Trim();
        user.IsActive = dto.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            user.PasswordHash = _passwordHasher.HashPassword(dto.NewPassword);
        }

        if (dto.Roles != null)
        {
            user.Roles.Clear();
            foreach (var roleName in dto.Roles)
            {
                var role = await _unitOfWork.Roles.GetByNameAsync(roleName.Trim());
                if (role != null && !user.Roles.Contains(role))
                {
                    user.Roles.Add(role);
                }
            }
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<UserDetailDto>.Ok(MapToDetailDto(user), "Cập nhật người dùng thành công.");
    }

    public async Task<ApiResponse> ToggleUserStatusAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
        {
            return ApiResponse.Fail("Không tìm thấy người dùng.");
        }

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync();

        var status = user.IsActive ? "kích hoạt" : "khóa";
        return ApiResponse.Ok($"Đã {status} tài khoản thành công.");
    }

    public async Task<ApiResponse> DeleteUserAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdWithRolesAsync(userId);
        if (user == null)
        {
            return ApiResponse.Fail("Không tìm thấy người dùng để xóa.");
        }

        user.Roles.Clear();
        _unitOfWork.Users.Remove(user);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse.Ok("Xóa người dùng thành công.");
    }

    public async Task<ApiResponse<List<string>>> GetAvailableRolesAsync()
    {
        var roles = await _unitOfWork.Roles.GetAllAsync();
        var roleNames = roles.Select(r => r.RoleName).OrderBy(r => r).ToList();
        return ApiResponse<List<string>>.Ok(roleNames);
    }

    private static UserDetailDto MapToDetailDto(User user)
    {
        return new UserDetailDto
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
