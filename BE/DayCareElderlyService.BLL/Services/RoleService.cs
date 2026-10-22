using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Admin.Role;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Services;

public class RoleService : IRoleService
{
    private readonly IUnitOfWork _unitOfWork;

    public RoleService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ApiResponse<IEnumerable<RoleDto>>> GetAllRolesAsync()
    {
        var roles = await _unitOfWork.Roles.GetAllWithUsersAsync();
        var dtos = roles.Select(MapToDto).ToList();

        return ApiResponse<IEnumerable<RoleDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<RoleDto>> GetRoleByIdAsync(int roleId)
    {
        var role = await _unitOfWork.Roles.GetByIdWithUsersAsync(roleId);
        if (role == null)
        {
            return ApiResponse<RoleDto>.Fail("Không tìm thấy quyền.");
        }

        return ApiResponse<RoleDto>.Ok(MapToDto(role));
    }

    public async Task<ApiResponse<RoleDto>> CreateRoleAsync(CreateRoleDto dto)
    {
        var roleName = dto.RoleName.Trim();

        if (await _unitOfWork.Roles.RoleNameExistsAsync(roleName))
        {
            return ApiResponse<RoleDto>.Fail($"Quyền '{roleName}' đã tồn tại.");
        }

        var role = new Role
        {
            RoleName = roleName,
            Description = dto.Description?.Trim()
        };

        await _unitOfWork.Roles.AddAsync(role);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<RoleDto>.Ok(MapToDto(role), "Tạo quyền mới thành công.");
    }

    public async Task<ApiResponse<RoleDto>> UpdateRoleAsync(int roleId, UpdateRoleDto dto)
    {
        var role = await _unitOfWork.Roles.GetByIdWithUsersAsync(roleId);
        if (role == null)
        {
            return ApiResponse<RoleDto>.Fail("Không tìm thấy quyền cần cập nhật.");
        }

        var newRoleName = dto.RoleName.Trim();
        if (await _unitOfWork.Roles.RoleNameExistsAsync(newRoleName, roleId))
        {
            return ApiResponse<RoleDto>.Fail($"Tên quyền '{newRoleName}' đã được sử dụng.");
        }

        role.RoleName = newRoleName;
        role.Description = dto.Description?.Trim();

        _unitOfWork.Roles.Update(role);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<RoleDto>.Ok(MapToDto(role), "Cập nhật quyền thành công.");
    }

    public async Task<ApiResponse> DeleteRoleAsync(int roleId)
    {
        var role = await _unitOfWork.Roles.GetByIdWithUsersAsync(roleId);
        if (role == null)
        {
            return ApiResponse.Fail("Không tìm thấy quyền để xóa.");
        }

        if (role.Users != null && role.Users.Count > 0)
        {
            return ApiResponse.Fail($"Không thể xóa quyền '{role.RoleName}' vì hiện đang có {role.Users.Count} người dùng thuộc quyền này.");
        }

        // Prevent deleting core system Admin role
        if (role.RoleName.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse.Fail("Không thể xóa quyền Admin mặc định của hệ thống.");
        }

        _unitOfWork.Roles.Remove(role);
        await _unitOfWork.SaveChangesAsync();

        return ApiResponse.Ok("Xóa quyền thành công.");
    }

    private static RoleDto MapToDto(Role role)
    {
        return new RoleDto
        {
            RoleId = role.RoleId,
            RoleName = role.RoleName,
            Description = role.Description,
            UserCount = role.Users?.Count ?? 0
        };
    }
}
