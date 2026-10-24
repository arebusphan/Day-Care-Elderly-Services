namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Cấu hình Cloudinary (mục "Cloudinary" trong appsettings). Lấy ở Cloudinary Console → Dashboard.
/// </summary>
public class CloudinarySettings
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;

    /// <summary>Thư mục gốc trên Cloudinary</summary>
    public string Folder { get; set; } = "day-care-elderly";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(CloudName) && !string.IsNullOrWhiteSpace(ApiKey) && !string.IsNullOrWhiteSpace(ApiSecret);
}
