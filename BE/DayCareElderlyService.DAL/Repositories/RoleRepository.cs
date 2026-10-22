using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.DAL.Repositories;

public class RoleRepository : Repository<Role>, IRoleRepository
{
    public RoleRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Role?> GetByNameAsync(string roleName)
    {
        return await _dbSet
            .FirstOrDefaultAsync(r => r.RoleName.ToLower() == roleName.Trim().ToLower());
    }

    public async Task<bool> RoleNameExistsAsync(string roleName, int? excludeRoleId = null)
    {
        var normalized = roleName.Trim().ToLower();
        return await _dbSet.AnyAsync(r =>
            r.RoleName.ToLower() == normalized &&
            (!excludeRoleId.HasValue || r.RoleId != excludeRoleId.Value));
    }

    public async Task<Role?> GetByIdWithUsersAsync(int roleId)
    {
        return await _dbSet
            .Include(r => r.Users)
            .FirstOrDefaultAsync(r => r.RoleId == roleId);
    }

    public async Task<IEnumerable<Role>> GetAllWithUsersAsync()
    {
        return await _dbSet
            .Include(r => r.Users)
            .OrderBy(r => r.RoleId)
            .ToListAsync();
    }
}
