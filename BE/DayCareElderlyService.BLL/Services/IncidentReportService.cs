using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.IncidentReport;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DayCareElderlyService.BLL.Services;

public class IncidentReportService : IIncidentReportService
{
    private readonly AppDbContext _context;
    private readonly ILogger<IncidentReportService> _logger;

    public IncidentReportService(AppDbContext context, ILogger<IncidentReportService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<IncidentReportDto>> CreateIncidentAsync(int userId, CreateIncidentReportDto dto)
    {
        try
        {
            var elderly = await _context.ElderlyMembers
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ElderlyId == dto.ElderlyId);

            if (elderly == null)
            {
                return ApiResponse<IncidentReportDto>.Fail("Người cao tuổi không tồn tại.");
            }

            var severity = string.IsNullOrWhiteSpace(dto.Severity) ? IncidentSeverities.Medium : dto.Severity.Trim();
            if (!IncidentSeverities.All.Contains(severity))
            {
                return ApiResponse<IncidentReportDto>.Fail($"Mức độ nghiêm trọng không hợp lệ. Chấp nhận: {string.Join(", ", IncidentSeverities.All)}");
            }

            var centerId = dto.CenterId ?? elderly.CenterId;
            var occurredAt = dto.OccurredAt ?? DateTime.UtcNow;

            var incident = new IncidentReport
            {
                ElderlyId = dto.ElderlyId,
                CenterId = centerId,
                ReportedBy = userId,
                IncidentType = dto.IncidentType.Trim(),
                Severity = severity,
                Description = dto.Description.Trim(),
                OccurredAt = occurredAt,
                ReportedAt = DateTime.UtcNow,
                Status = IncidentStatuses.Open,
                IsSupplyConfirmed = false
            };

            await _context.IncidentReports.AddAsync(incident);
            await _context.SaveChangesAsync();

            // Load navigations for response
            await _context.Entry(incident).Reference(i => i.Elderly).LoadAsync();
            await _context.Entry(incident).Reference(i => i.Center).LoadAsync();
            await _context.Entry(incident).Reference(i => i.ReportedByNavigation).LoadAsync();

            return ApiResponse<IncidentReportDto>.Ok(MapToDto(incident), "Tạo sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi tạo sự cố mới");
            return ApiResponse<IncidentReportDto>.Fail("Đã xảy ra lỗi hệ thống khi tạo sự cố.");
        }
    }

    public async Task<ApiResponse<PagedResult<IncidentReportDto>>> GetIncidentsPagedAsync(IncidentReportFilterDto filter)
    {
        try
        {
            var query = _context.IncidentReports
                .Include(i => i.Elderly)
                .Include(i => i.Center)
                .Include(i => i.ReportedByNavigation)
                .AsNoTracking();

            if (filter.ElderlyId.HasValue)
            {
                query = query.Where(i => i.ElderlyId == filter.ElderlyId.Value);
            }

            if (filter.CenterId.HasValue)
            {
                query = query.Where(i => i.CenterId == filter.CenterId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(i => i.Status == filter.Status.Trim());
            }

            if (!string.IsNullOrWhiteSpace(filter.Severity))
            {
                query = query.Where(i => i.Severity == filter.Severity.Trim());
            }

            if (filter.IsSupplyConfirmed.HasValue)
            {
                query = query.Where(i => i.IsSupplyConfirmed == filter.IsSupplyConfirmed.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(i => i.Description.ToLower().Contains(term)
                                      || i.IncidentType.ToLower().Contains(term)
                                      || i.Elderly.FullName.ToLower().Contains(term));
            }

            var totalItems = await query.CountAsync();
            var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
            var pageSize = filter.PageSize < 1 ? 10 : (filter.PageSize > 100 ? 100 : filter.PageSize);

            var items = await query
                .OrderByDescending(i => i.OccurredAt)
                .ThenByDescending(i => i.ReportedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(i => MapToDto(i))
                .ToListAsync();

            var pagedResult = new PagedResult<IncidentReportDto>(items, totalItems, pageNumber, pageSize);
            return ApiResponse<PagedResult<IncidentReportDto>>.Ok(pagedResult, "Lấy danh sách sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách sự cố phân trang");
            return ApiResponse<PagedResult<IncidentReportDto>>.Fail("Đã xảy ra lỗi hệ thống khi lấy danh sách sự cố.");
        }
    }

    public async Task<ApiResponse<IncidentReportDto>> GetIncidentByIdAsync(int incidentId)
    {
        try
        {
            var incident = await _context.IncidentReports
                .Include(i => i.Elderly)
                .Include(i => i.Center)
                .Include(i => i.ReportedByNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
            }

            return ApiResponse<IncidentReportDto>.Ok(MapToDto(incident), "Lấy chi tiết sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết sự cố {IncidentId}", incidentId);
            return ApiResponse<IncidentReportDto>.Fail("Đã xảy ra lỗi hệ thống khi lấy chi tiết sự cố.");
        }
    }

    public async Task<ApiResponse<IncidentReportDto>> UpdateIncidentAsync(int incidentId, UpdateIncidentReportDto dto)
    {
        try
        {
            var incident = await _context.IncidentReports
                .Include(i => i.Elderly)
                .Include(i => i.Center)
                .Include(i => i.ReportedByNavigation)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
            }

            var severity = string.IsNullOrWhiteSpace(dto.Severity) ? incident.Severity : dto.Severity.Trim();
            if (!IncidentSeverities.All.Contains(severity))
            {
                return ApiResponse<IncidentReportDto>.Fail($"Mức độ nghiêm trọng không hợp lệ. Chấp nhận: {string.Join(", ", IncidentSeverities.All)}");
            }

            incident.IncidentType = dto.IncidentType.Trim();
            incident.Severity = severity;
            incident.Description = dto.Description.Trim();
            if (dto.OccurredAt.HasValue)
            {
                incident.OccurredAt = dto.OccurredAt.Value;
            }
            if (dto.ResolutionNotes != null)
            {
                var (_, currentSup) = ParseResolutionNotes(incident.ResolutionNotes);
                incident.ResolutionNotes = FormatResolutionNotes(dto.ResolutionNotes.Trim(), currentSup);
            }

            // Lưu ý: Không cập nhật IsSupplyConfirmed qua API update thông thường
            await _context.SaveChangesAsync();

            return ApiResponse<IncidentReportDto>.Ok(MapToDto(incident), "Cập nhật thông tin sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật sự cố {IncidentId}", incidentId);
            return ApiResponse<IncidentReportDto>.Fail("Đã xảy ra lỗi hệ thống khi cập nhật sự cố.");
        }
    }

    public async Task<ApiResponse<IncidentReportDto>> UpdateIncidentStatusAsync(int incidentId, UpdateIncidentStatusDto dto)
    {
        try
        {
            var incident = await _context.IncidentReports
                .Include(i => i.Elderly)
                .Include(i => i.Center)
                .Include(i => i.ReportedByNavigation)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
            }

            var validStatuses = new[] { IncidentStatuses.Open, IncidentStatuses.InProgress, IncidentStatuses.Resolved };
            var targetStatus = dto.Status.Trim();
            if (!validStatuses.Contains(targetStatus))
            {
                return ApiResponse<IncidentReportDto>.Fail($"Trạng thái không hợp lệ. Chấp nhận: {string.Join(", ", validStatuses)}");
            }

            incident.Status = targetStatus;
            if (!string.IsNullOrWhiteSpace(dto.ResolutionNotes))
            {
                var (_, currentSup) = ParseResolutionNotes(incident.ResolutionNotes);
                incident.ResolutionNotes = FormatResolutionNotes(dto.ResolutionNotes.Trim(), currentSup);
            }

            if (targetStatus == IncidentStatuses.Resolved)
            {
                incident.ResolvedAt = DateTime.UtcNow;
            }
            else if (targetStatus == IncidentStatuses.Open)
            {
                incident.ResolvedAt = null;
            }

            await _context.SaveChangesAsync();

            return ApiResponse<IncidentReportDto>.Ok(MapToDto(incident), "Cập nhật trạng thái sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật trạng thái sự cố {IncidentId}", incidentId);
            return ApiResponse<IncidentReportDto>.Fail("Đã xảy ra lỗi hệ thống khi cập nhật trạng thái sự cố.");
        }
    }

    public async Task<ApiResponse<IncidentReportDto>> UpdateSupplyConfirmationAsync(int incidentId, UpdateSupplyConfirmationDto dto)
    {
        try
        {
            var incident = await _context.IncidentReports
                .Include(i => i.Elderly)
                .Include(i => i.Center)
                .Include(i => i.ReportedByNavigation)
                .FirstOrDefaultAsync(i => i.IncidentId == incidentId);

            if (incident == null)
            {
                return ApiResponse<IncidentReportDto>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
            }

            incident.IsSupplyConfirmed = dto.IsSupplyConfirmed;
            if (!string.IsNullOrWhiteSpace(dto.Notes))
            {
                var (currentRes, _) = ParseResolutionNotes(incident.ResolutionNotes);
                incident.ResolutionNotes = FormatResolutionNotes(currentRes, dto.Notes.Trim());
            }

            await _context.SaveChangesAsync();

            var msg = dto.IsSupplyConfirmed
                ? "Đã xác nhận vật tư cho sự cố thành công."
                : "Đã hủy xác nhận vật tư cho sự cố.";

            return ApiResponse<IncidentReportDto>.Ok(MapToDto(incident), msg);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật xác nhận vật tư cho sự cố {IncidentId}", incidentId);
            return ApiResponse<IncidentReportDto>.Fail("Đã xảy ra lỗi hệ thống khi cập nhật xác nhận vật tư.");
        }
    }

    public async Task<ApiResponse<bool>> DeleteIncidentAsync(int incidentId)
    {
        try
        {
            var incident = await _context.IncidentReports.FirstOrDefaultAsync(i => i.IncidentId == incidentId);
            if (incident == null)
            {
                return ApiResponse<bool>.Fail("Không tìm thấy sự cố.", new List<string> { "INCIDENT_NOT_FOUND" });
            }

            if (incident.IsSupplyConfirmed)
            {
                return ApiResponse<bool>.Fail("Không thể xóa sự cố đã được xác nhận vật tư.", new List<string> { "SUPPLY_ALREADY_CONFIRMED" });
            }

            _context.IncidentReports.Remove(incident);
            await _context.SaveChangesAsync();

            return ApiResponse<bool>.Ok(true, "Xóa sự cố thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi xóa sự cố {IncidentId}", incidentId);
            return ApiResponse<bool>.Fail("Đã xảy ra lỗi hệ thống khi xóa sự cố.");
        }
    }

    private static IncidentReportDto MapToDto(IncidentReport i)
    {
        return new IncidentReportDto
        {
            IncidentId = i.IncidentId,
            ElderlyId = i.ElderlyId,
            ElderlyName = i.Elderly?.FullName ?? string.Empty,
            CenterId = i.CenterId,
            CenterName = i.Center?.CenterName ?? string.Empty,
            ReportedBy = i.ReportedBy,
            ReportedByName = i.ReportedByNavigation?.FullName ?? string.Empty,
            IncidentType = i.IncidentType,
            Severity = i.Severity,
            Description = i.Description,
            OccurredAt = i.OccurredAt,
            ReportedAt = i.ReportedAt,
            Status = i.Status,
            ResolutionNotes = i.ResolutionNotes,
            ResolvedAt = i.ResolvedAt,
            IsSupplyConfirmed = i.IsSupplyConfirmed
        };
    }

    private static (string? ResolutionPart, string? SupplyPart) ParseResolutionNotes(string? rawNotes)
    {
        if (string.IsNullOrWhiteSpace(rawNotes))
        {
            return (null, null);
        }

        const string ResolutionPrefix = "[Xử lý sự cố]:";
        const string SupplyPrefix = "[Vật tư]:";

        int resIdx = rawNotes.IndexOf(ResolutionPrefix, StringComparison.OrdinalIgnoreCase);
        int supIdx = rawNotes.IndexOf(SupplyPrefix, StringComparison.OrdinalIgnoreCase);

        // Trường hợp 1: Có cả 2 tag
        if (resIdx >= 0 && supIdx >= 0)
        {
            if (resIdx < supIdx)
            {
                var resText = rawNotes.Substring(resIdx + ResolutionPrefix.Length, supIdx - (resIdx + ResolutionPrefix.Length)).Trim();
                if (resText.EndsWith("|")) resText = resText.Substring(0, resText.Length - 1).Trim();
                var supText = rawNotes.Substring(supIdx + SupplyPrefix.Length).Trim();
                return (string.IsNullOrWhiteSpace(resText) ? null : resText, string.IsNullOrWhiteSpace(supText) ? null : supText);
            }
            else
            {
                var supText = rawNotes.Substring(supIdx + SupplyPrefix.Length, resIdx - (supIdx + SupplyPrefix.Length)).Trim();
                if (supText.EndsWith("|")) supText = supText.Substring(0, supText.Length - 1).Trim();
                var resText = rawNotes.Substring(resIdx + ResolutionPrefix.Length).Trim();
                return (string.IsNullOrWhiteSpace(resText) ? null : resText, string.IsNullOrWhiteSpace(supText) ? null : supText);
            }
        }

        // Trường hợp 2: Có tag [Vật tư]:
        if (supIdx >= 0)
        {
            var beforeSup = rawNotes.Substring(0, supIdx).Trim();
            if (beforeSup.EndsWith("|")) beforeSup = beforeSup.Substring(0, beforeSup.Length - 1).Trim();
            var supText = rawNotes.Substring(supIdx + SupplyPrefix.Length).Trim();
            return (string.IsNullOrWhiteSpace(beforeSup) ? null : beforeSup, string.IsNullOrWhiteSpace(supText) ? null : supText);
        }

        // Hỗ trợ thêm định dạng cũ: [Vật tư: ...]
        const string LegacySupplyPrefix = "[Vật tư: ";
        int legIdx = rawNotes.IndexOf(LegacySupplyPrefix, StringComparison.OrdinalIgnoreCase);
        if (legIdx >= 0)
        {
            var beforeSup = rawNotes.Substring(0, legIdx).Trim();
            if (beforeSup.EndsWith("|")) beforeSup = beforeSup.Substring(0, beforeSup.Length - 1).Trim();
            var supEndIdx = rawNotes.IndexOf("]", legIdx, StringComparison.OrdinalIgnoreCase);
            var supText = supEndIdx > legIdx
                ? rawNotes.Substring(legIdx + LegacySupplyPrefix.Length, supEndIdx - (legIdx + LegacySupplyPrefix.Length)).Trim()
                : rawNotes.Substring(legIdx + LegacySupplyPrefix.Length).Trim();
            return (string.IsNullOrWhiteSpace(beforeSup) ? null : beforeSup, string.IsNullOrWhiteSpace(supText) ? null : supText);
        }

        // Trường hợp 3: Có tag [Xử lý sự cố]:
        if (resIdx >= 0)
        {
            var resText = rawNotes.Substring(resIdx + ResolutionPrefix.Length).Trim();
            return (string.IsNullOrWhiteSpace(resText) ? null : resText, null);
        }

        // Trường hợp 4: Chuỗi thông thường không có tiền tố -> coi là ghi chú xử lý
        return (rawNotes.Trim(), null);
    }

    private static string? FormatResolutionNotes(string? resolutionPart, string? supplyPart)
    {
        resolutionPart = resolutionPart?.Trim();
        supplyPart = supplyPart?.Trim();

        bool hasRes = !string.IsNullOrWhiteSpace(resolutionPart);
        bool hasSup = !string.IsNullOrWhiteSpace(supplyPart);

        if (hasRes && hasSup)
        {
            return $"[Xử lý sự cố]: {resolutionPart} | [Vật tư]: {supplyPart}";
        }
        if (hasRes)
        {
            return $"[Xử lý sự cố]: {resolutionPart}";
        }
        if (hasSup)
        {
            return $"[Vật tư]: {supplyPart}";
        }
        return null;
    }
}
