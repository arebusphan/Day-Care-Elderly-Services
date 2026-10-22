using System.Security.Cryptography;

namespace DayCareElderlyService.BLL.Security;

public class PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16; // 128 bits
    private const int KeySize = 32;  // 256 bits
    private const int Iterations = 100_000;
    private static readonly HashAlgorithmName Algorithm = HashAlgorithmName.SHA256;

    public string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] key = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            Algorithm,
            KeySize
        );

        return $"PBKDF2${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
    }

    public bool VerifyPassword(string hashedPassword, string providedPassword)
    {
        if (string.IsNullOrEmpty(hashedPassword) || string.IsNullOrEmpty(providedPassword))
        {
            return false;
        }

        // Support PBKDF2 formatted hash
        if (hashedPassword.StartsWith("PBKDF2$"))
        {
            var parts = hashedPassword.Split('$');
            if (parts.Length != 4) return false;

            if (!int.TryParse(parts[1], out int iterations)) return false;

            byte[] salt = Convert.FromBase64String(parts[2]);
            byte[] expectedKey = Convert.FromBase64String(parts[3]);

            byte[] actualKey = Rfc2898DeriveBytes.Pbkdf2(
                providedPassword,
                salt,
                iterations,
                Algorithm,
                expectedKey.Length
            );

            return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
        }

        // Fallback for simple SHA256 if someone stored simple SHA256 hash
        using var sha = SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(providedPassword);
        var hash = Convert.ToHexString(sha.ComputeHash(bytes));
        if (string.Equals(hash, hashedPassword, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}
