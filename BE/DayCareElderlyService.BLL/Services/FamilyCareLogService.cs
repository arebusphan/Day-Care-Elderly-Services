using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class FamilyCareLogService : IFamilyCareLogService
{
    private const int MaxHistoryDays = 92;

    private readonly AppDbContext _context;

    public FamilyCareLogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<CareLogDayDto>> GetDayAsync(Guid userId, Guid elderlyId, DateOnly? date)
    {
        var elderly = await GetViewableElderlyAsync(userId, elderlyId);
        if (elderly == null)
        {
            return ApiResponse<CareLogDayDto>.Fail("Không tìm thấy người cao tuổi hoặc bạn không có quyền xem care log.");
        }

        var day = await CareLogShared.BuildDayAsync(_context, elderly, date ?? VietnamTime.Today, includeInternal: false);
        return ApiResponse<CareLogDayDto>.Ok(day, "Lấy care log thành công.");
    }

    public async Task<ApiResponse<List<CareLogDaySummaryDto>>> GetHistoryAsync(Guid userId, Guid elderlyId, DateOnly? from, DateOnly? to)
    {
        var toDate = to ?? VietnamTime.Today;
        var fromDate = from ?? toDate.AddDays(-29);
        if (fromDate > toDate)
        {
            return ApiResponse<List<CareLogDaySummaryDto>>.Fail("Ngày bắt đầu phải trước ngày kết thúc.");
        }
        if (toDate.DayNumber - fromDate.DayNumber >= MaxHistoryDays)
        {
            return ApiResponse<List<CareLogDaySummaryDto>>.Fail($"Chỉ xem được tối đa {MaxHistoryDays} ngày mỗi lần.");
        }

        var elderly = await GetViewableElderlyAsync(userId, elderlyId);
        if (elderly == null)
        {
            return ApiResponse<List<CareLogDaySummaryDto>>.Fail("Không tìm thấy người cao tuổi hoặc bạn không có quyền xem care log.");
        }

        var rangeFrom = VietnamTime.DayRange(fromDate).From;
        var rangeTo = VietnamTime.DayRange(toDate).To;
        var logs = await _context.CareLogs
            .Where(c => c.ElderlyId == elderlyId && !c.IsInternal && c.RecordedAt >= rangeFrom && c.RecordedAt < rangeTo)
            .Select(c => new { c.CareType, c.RecordedAt })
            .ToListAsync();

        var days = logs
            .GroupBy(l => DateOnly.FromDateTime(l.RecordedAt))
            .Select(g => new CareLogDaySummaryDto
            {
                Date = g.Key,
                EntryCount = g.Count(l => l.CareType != CareLogTypes.MedicalDone && l.CareType != CareLogTypes.Close),
                IsMedicalDone = g.Any(l => l.CareType == CareLogTypes.MedicalDone),
                IsClosed = g.Any(l => l.CareType == CareLogTypes.Close),
                LastRecordedAt = g.Max(l => l.RecordedAt)
            })
            .OrderByDescending(d => d.Date)
            .ToList();

        return ApiResponse<List<CareLogDaySummaryDto>>.Ok(days, "Lấy lịch sử care log thành công.");
    }

    public async Task<ApiResponse<HealthHistoryDto>> GetHealthAsync(Guid userId, Guid elderlyId, int days)
    {
        var elderly = await GetViewableElderlyAsync(userId, elderlyId);
        if (elderly == null)
        {
            return ApiResponse<HealthHistoryDto>.Fail("Không tìm thấy người cao tuổi hoặc bạn không có quyền xem care log.");
        }

        var toDate = VietnamTime.Today;
        var fromDate = toDate.AddDays(-(Math.Clamp(days, 1, 90) - 1));
        var rangeFrom = VietnamTime.DayRange(fromDate).From;
        var now = VietnamTime.Now;

        var vitals = await CareLogShared.CareLogQuery(_context)
            .Where(c => c.ElderlyId == elderlyId && c.CareType == CareLogTypes.Vitals && !c.IsInternal && c.RecordedAt >= rangeFrom)
            .OrderByDescending(c => c.RecordedAt)
            .ToListAsync();

        var doses = await CareLogShared.DoseQuery(_context)
            .Where(r => r.MedicationPlan.ElderlyId == elderlyId && r.ScheduledAt >= rangeFrom
                     && (r.ScheduledAt <= now || r.RecordedAt != null))
            .OrderByDescending(r => r.ScheduledAt)
            .ToListAsync();

        var result = new HealthHistoryDto
        {
            ElderlyId = elderlyId,
            From = fromDate,
            To = toDate,
            Vitals = vitals.Select(CareLogShared.ToEntryDto).ToList(),
            Doses = doses.Select(CareLogShared.ToDoseDto).ToList()
        };
        return ApiResponse<HealthHistoryDto>.Ok(result, "Lấy lịch sử sức khỏe thành công.");
    }

    public async Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(Guid userId, int days)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        var elderlyIds = await _context.ElderlyFamilyRelationships
            .Where(r => r.FamilyMember.UserId == userId && r.CanViewCareLogs)
            .Select(r => r.ElderlyId)
            .ToListAsync();

        var from = VietnamTime.Now.AddDays(-Math.Clamp(days, 1, 90));
        var incidents = await CareLogShared.IncidentQuery(_context)
            .Where(i => elderlyIds.Contains(i.ElderlyId) && i.ReportedAt >= from)
            .OrderByDescending(i => i.ReportedAt)
            .ToListAsync();

        return ApiResponse<List<IncidentDto>>.Ok(incidents.Select(CareLogShared.ToIncidentDto).ToList(), "Lấy danh sách sự cố thành công.");
    }

    /// <summary>
    /// Cụ thuộc gia đình của tài khoản và được phép xem care log (CanViewCareLogs)
    /// </summary>
    private async Task<ElderlyMember?> GetViewableElderlyAsync(Guid userId, Guid elderlyId)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        return await _context.ElderlyFamilyRelationships
            .Where(r => r.FamilyMember.UserId == userId && r.ElderlyId == elderlyId
                     && r.CanViewCareLogs && r.Elderly.IsActive)
            .Select(r => r.Elderly)
            .FirstOrDefaultAsync();
    }
}
