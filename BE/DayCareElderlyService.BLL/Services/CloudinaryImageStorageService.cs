using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.Extensions.Configuration;

namespace DayCareElderlyService.BLL.Services;

public class CloudinaryImageStorageService : IImageStorageService
{
    private readonly CloudinarySettings _settings;
    private readonly Cloudinary? _cloudinary;

    public CloudinaryImageStorageService(IConfiguration configuration)
    {
        _settings = new CloudinarySettings();
        configuration.GetSection(CloudinarySettings.SectionName).Bind(_settings);

        if (_settings.IsConfigured)
        {
            _cloudinary = new Cloudinary(new Account(_settings.CloudName, _settings.ApiKey, _settings.ApiSecret));
            _cloudinary.Api.Secure = true;
        }
    }

    public bool IsConfigured => _cloudinary != null;

    public string CareLogPhotoPublicId(Guid photoId) => $"{_settings.Folder}/carelogs/{photoId:N}";

    public async Task<string> UploadAsync(Stream content, string fileName, string publicId)
    {
        if (_cloudinary == null)
        {
            throw new InvalidOperationException("Chưa cấu hình Cloudinary.");
        }

        var result = await _cloudinary.UploadAsync(new ImageUploadParams
        {
            File = new FileDescription(fileName, content),
            PublicId = publicId,
            Overwrite = false
        });

        if (result.Error != null || result.SecureUrl == null)
        {
            throw new InvalidOperationException($"Upload ảnh lên Cloudinary thất bại: {result.Error?.Message}");
        }

        return result.SecureUrl.ToString();
    }

    public async Task DeleteAsync(string publicId)
    {
        if (_cloudinary == null) return;

        await _cloudinary.DestroyAsync(new DeletionParams(publicId) { ResourceType = ResourceType.Image });
    }
}
