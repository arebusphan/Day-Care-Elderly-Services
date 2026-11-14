using System.Text.Json;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.DTOs.IncidentReport;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// F-14 / WF-05: vật tư dùng khi xử lý sự cố → trừ kho qua SupplyTransactions, tính phí riêng, báo gia đình.
/// Kèm ảnh sự cố (SRS 3.9.1).
/// </summary>
public class IncidentOperationsService : IIncidentOperationsService
{
    private const int MaxPhotosPerIncident = 10;
    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private static readonly string[] AllowedTypes = { "image/jpeg", "image/png", "image/webp" };

    private readonly AppDbContext _context;
    private readonly IImageStorageService _imageStorage;

    public IncidentOperationsService(AppDbContext context, IImageStorageService imageStorage)
    {
        _context = context;
        _imageStorage = imageStorage;
    }

    public async Task<ApiResponse<List<IncidentSupplyUsageDto>>> RecordSuppliesAsync(int userId, int incidentId, RecordIncidentSuppliesDto dto)
    {
        var incident = await _context.IncidentReports
            .Include(i => i.Elderly)
            .FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            return ApiResponse<List<IncidentSupplyUsageDto>>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
        }

        var items = dto.Items
            .GroupBy(i => i.SupplyId)
            .Select(g => new { SupplyId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();
        var supplyIds = items.Select(i => i.SupplyId).ToList();
        var supplies = await _context.MedicalSupplies.Where(s => supplyIds.Contains(s.SupplyId)).ToListAsync();

        var errors = new List<string>();
        foreach (var item in items)
        {
            var supply = supplies.FirstOrDefault(s => s.SupplyId == item.SupplyId);
            if (supply == null) errors.Add($"Không tìm thấy vật tư #{item.SupplyId}.");
            else if (!supply.IsActive) errors.Add($"Vật tư \"{supply.SupplyName}\" đã ngừng sử dụng.");
            else if (item.Quantity <= 0) errors.Add($"Số lượng \"{supply.SupplyName}\" phải lớn hơn 0.");
            else if (supply.QuantityInStock < item.Quantity)
                errors.Add($"\"{supply.SupplyName}\" chỉ còn {supply.QuantityInStock:0.##} {supply.Unit}.");
        }
        if (errors.Count > 0)
        {
            return ApiResponse<List<IncidentSupplyUsageDto>>.Fail(string.Join(" ", errors), errors);
        }

        decimal charge = 0;
        foreach (var item in items)
        {
            var supply = supplies.First(s => s.SupplyId == item.SupplyId);
            await SupplyStock.ApplyAsync(_context, supply, -item.Quantity, SupplyStock.TypeIncident, userId, dto.Notes,
                incident.IncidentId, supply.UnitPrice);
            charge += supply.UnitPrice * item.Quantity;
        }

        incident.SupplyChargeAmount += charge;
        incident.IsSupplyConfirmed = true;

        var usedText = string.Join(", ", items.Select(i =>
        {
            var s = supplies.First(x => x.SupplyId == i.SupplyId);
            return $"{s.SupplyName} × {i.Quantity:0.##} {s.Unit}";
        }));
        await CareLogShared.NotifyFamilyAsync(_context, incident.ElderlyId,
            $"Vật tư dùng khi xử lý sự cố của {incident.Elderly.FullName}",
            charge > 0
                ? $"{usedText}. Phí vật tư tính riêng: {charge:N0} đ (tổng {incident.SupplyChargeAmount:N0} đ)."
                : $"{usedText}. Không phát sinh phí.",
            "IncidentSupply", nameof(IncidentReport), incident.IncidentId);

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "RECORD_INCIDENT_SUPPLIES", nameof(IncidentReport),
            incident.IncidentId.ToString(), new { Items = items, Charge = charge });

        return await GetSupplyUsageAsync(incidentId);
    }

    public async Task<ApiResponse<List<IncidentSupplyUsageDto>>> GetSupplyUsageAsync(int incidentId)
    {
        var exists = await _context.IncidentReports.AnyAsync(i => i.IncidentId == incidentId);
        if (!exists)
        {
            return ApiResponse<List<IncidentSupplyUsageDto>>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
        }

        var rows = await _context.SupplyTransactions
            .Where(t => t.IncidentId == incidentId)
            .OrderByDescending(t => t.OccurredAt)
            .Select(t => new IncidentSupplyUsageDto
            {
                SupplyTransactionId = t.SupplyTransactionId,
                SupplyId = t.SupplyId,
                SupplyName = t.Supply.SupplyName,
                Unit = t.Supply.Unit,
                Quantity = t.Quantity,
                UnitPrice = t.UnitPrice ?? 0,
                Amount = (t.UnitPrice ?? 0) * t.Quantity,
                OccurredAt = t.OccurredAt,
                RecordedByName = t.RecordedByNavigation.FullName,
                Notes = t.Notes
            })
            .ToListAsync();

        return ApiResponse<List<IncidentSupplyUsageDto>>.Ok(rows, "Lấy danh sách vật tư đã dùng thành công.");
    }

    public async Task<ApiResponse<List<string>>> AddPhotosAsync(int userId, int incidentId, List<PhotoUploadFile> files)
    {
        var incident = await _context.IncidentReports.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            return ApiResponse<List<string>>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
        }
        if (files.Count == 0)
        {
            return ApiResponse<List<string>>.Fail("Vui lòng chọn ít nhất một ảnh.");
        }

        var urls = IncidentReportService.ParsePhotoUrls(incident.PhotoUrls);
        if (urls.Count + files.Count > MaxPhotosPerIncident)
        {
            return ApiResponse<List<string>>.Fail($"Mỗi sự cố tối đa {MaxPhotosPerIncident} ảnh.");
        }
        foreach (var file in files)
        {
            if (!AllowedTypes.Contains(file.ContentType.ToLowerInvariant()))
                return ApiResponse<List<string>>.Fail($"Ảnh \"{file.FileName}\" không hợp lệ. Chỉ nhận jpg, png, webp.");
            if (file.Length <= 0 || file.Length > MaxPhotoBytes)
                return ApiResponse<List<string>>.Fail($"Ảnh \"{file.FileName}\" phải lớn hơn 0 và tối đa 5MB.");
        }

        foreach (var file in files)
        {
            var publicId = $"incident-{incidentId}-{Guid.NewGuid():N}";
            urls.Add(await _imageStorage.UploadAsync(file.Content, file.FileName, publicId));
        }

        incident.PhotoUrls = JsonSerializer.Serialize(urls);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "ADD_INCIDENT_PHOTOS", nameof(IncidentReport),
            incident.IncidentId.ToString(), new { Count = files.Count });

        return ApiResponse<List<string>>.Ok(urls, "Đã tải ảnh sự cố.");
    }
}
