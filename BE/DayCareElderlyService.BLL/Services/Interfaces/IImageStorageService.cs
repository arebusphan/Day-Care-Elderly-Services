namespace DayCareElderlyService.BLL.Services.Interfaces;

/// <summary>
/// Lưu ảnh lên dịch vụ ngoài (Cloudinary). publicId do BE tự đặt để xoá lại được.
/// </summary>
public interface IImageStorageService
{
    bool IsConfigured { get; }

    /// <summary>Upload ảnh, trả về link https của ảnh</summary>
    Task<string> UploadAsync(Stream content, string fileName, string publicId);

    Task DeleteAsync(string publicId);

    /// <summary>publicId đầy đủ (gồm thư mục gốc) của ảnh care log</summary>
    string CareLogPhotoPublicId(Guid photoId);
}
