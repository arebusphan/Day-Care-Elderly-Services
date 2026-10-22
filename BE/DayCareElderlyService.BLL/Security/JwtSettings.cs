namespace DayCareElderlyService.BLL.Security;

public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    public string SecretKey { get; set; } = "DayCareElderlyService_Super_Secret_Key_For_JWT_Authentication_2026!#";
    public string Issuer { get; set; } = "DayCareElderlyServiceAPI";
    public string Audience { get; set; } = "DayCareElderlyServiceClient";
    public int ExpiryMinutes { get; set; } = 1440; // 24 hours default
}
