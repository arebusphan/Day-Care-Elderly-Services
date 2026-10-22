using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DayCareElderlyService.Models.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace DayCareElderlyService.BLL.Security;

public class TokenService : ITokenService
{
    private readonly JwtSettings _jwtSettings;

    public TokenService(IConfiguration configuration)
    {
        _jwtSettings = new JwtSettings();
        configuration.GetSection(JwtSettings.SectionName).Bind(_jwtSettings);

        // Ensure key is at least 32 bytes for HMAC-SHA256
        if (string.IsNullOrWhiteSpace(_jwtSettings.SecretKey) || _jwtSettings.SecretKey.Length < 32)
        {
            _jwtSettings.SecretKey = "DayCareElderlyService_Super_Secret_Key_For_JWT_Authentication_2026!#";
        }
    }

    public (string Token, DateTime ExpiresAt) GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSettings.SecretKey);
        var expiresAt = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryMinutes > 0 ? _jwtSettings.ExpiryMinutes : 1440);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            claims.Add(new Claim(ClaimTypes.MobilePhone, user.PhoneNumber));
        }

        // Add role claims
        if (user.Roles != null && user.Roles.Count > 0)
        {
            foreach (var role in user.Roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role.RoleName));
            }
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature
            )
        };

        var securityToken = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(securityToken);

        return (tokenString, expiresAt);
    }
}
