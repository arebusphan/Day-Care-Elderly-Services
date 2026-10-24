namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// 1 file ảnh controller đọc từ multipart/form-data, chuyển xuống service
/// </summary>
public class PhotoUploadFile
{
    public Stream Content { get; set; } = Stream.Null;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Length { get; set; }
}
