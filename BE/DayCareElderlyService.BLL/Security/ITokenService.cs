using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Security;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateToken(User user);
}
