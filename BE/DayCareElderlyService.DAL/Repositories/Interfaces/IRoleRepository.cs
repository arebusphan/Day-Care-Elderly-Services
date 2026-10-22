using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.DAL.Repositories.Interfaces;

public interface IRoleRepository : IRepository<Role>
{
    Task<Role?> GetByNameAsync(string roleName);
    Task<bool> RoleNameExistsAsync(string roleName, int? excludeRoleId = null);
    Task<Role?> GetByIdWithUsersAsync(int roleId);
    Task<IEnumerable<Role>> GetAllWithUsersAsync();
}
