using DayCareElderlyService.DAL.Repositories.Interfaces;

namespace DayCareElderlyService.DAL.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IRoleRepository Roles { get; }
    Task<int> SaveChangesAsync();
}
