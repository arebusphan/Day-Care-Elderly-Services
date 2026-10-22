using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.DAL.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailWithRolesAsync(string email)
    {
        return await _dbSet
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower());
    }

    public async Task<User?> GetByIdWithRolesAsync(Guid userId)
    {
        return await _dbSet
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId);
    }

    public async Task<bool> EmailExistsAsync(string email, Guid? excludeUserId = null)
    {
        var normalizedEmail = email.Trim().ToLower();
        return await _dbSet.AnyAsync(u => 
            u.Email.ToLower() == normalizedEmail && 
            (!excludeUserId.HasValue || u.UserId != excludeUserId.Value));
    }

    public async Task<(IEnumerable<User> Users, int TotalCount)> GetPagedUsersAsync(
        string? search,
        string? roleName,
        bool? isActive,
        int pageNumber,
        int pageSize)
    {
        var query = _dbSet.Include(u => u.Roles).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(searchLower) ||
                u.Email.ToLower().Contains(searchLower) ||
                (u.PhoneNumber != null && u.PhoneNumber.Contains(searchLower)));
        }

        if (!string.IsNullOrWhiteSpace(roleName))
        {
            var roleLower = roleName.Trim().ToLower();
            query = query.Where(u => u.Roles.Any(r => r.RoleName.ToLower() == roleLower));
        }

        if (isActive.HasValue)
        {
            query = query.Where(u => u.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (users, totalCount);
    }
}
