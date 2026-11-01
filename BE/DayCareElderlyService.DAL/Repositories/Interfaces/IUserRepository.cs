using DayCareElderlyService.DAL.Repositories.Interfaces;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.DAL.Repositories.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailWithRolesAsync(string email);
    Task<User?> GetByIdWithRolesAsync(int userId);
    Task<bool> EmailExistsAsync(string email, int? excludeUserId = null);
    Task<(IEnumerable<User> Users, int TotalCount)> GetPagedUsersAsync(
        string? search,
        string? roleName,
        bool? isActive,
        int pageNumber,
        int pageSize);
}
