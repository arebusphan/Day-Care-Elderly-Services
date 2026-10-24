namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Ảnh đính kèm 1 mục care log (1 dòng CareLogPhotos, Url là link Cloudinary)
/// </summary>
public class CareLogPhotoDto
{
    public Guid PhotoId { get; set; }
    public Guid CareLogId { get; set; }
    public string Url { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
