using System.Text.Json;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// Truy vấn và map dùng chung giữa CareLogService (staff) và FamilyCareLogService (gia đình)
/// </summary>
internal static class CareLogShared
{
    public static IQueryable<CareLog> CareLogQuery(AppDbContext context) =>
        context.CareLogs
            .Include(c => c.Staff).ThenInclude(s => s.User)
            .Include(c => c.CenterActivity)
            .Include(c => c.CareLogPhotos);

    public static IQueryable<IncidentReport> IncidentQuery(AppDbContext context) =>
        context.IncidentReports
            .Include(i => i.Elderly)
            .Include(i => i.ReportedByNavigation).ThenInclude(s => s.User);

    public static IQueryable<MedicationRecord> DoseQuery(AppDbContext context) =>
        context.MedicationRecords
            .Include(r => r.MedicationPlan).ThenInclude(p => p.Elderly)
            .Include(r => r.Staff).ThenInclude(s => s.User);

    /// <summary>
    /// Care log 1 ngày của 1 cụ. includeInternal = false: ẩn mục nội bộ (dành cho gia đình).
    /// </summary>
    public static async Task<CareLogDayDto> BuildDayAsync(AppDbContext context, ElderlyMember elderly, DateOnly date, bool includeInternal)
    {
        var (from, to) = VietnamTime.DayRange(date);
        var query = CareLogQuery(context)
            .Where(c => c.ElderlyId == elderly.ElderlyId && c.RecordedAt >= from && c.RecordedAt < to);

        if (!includeInternal)
        {
            query = query.Where(c => !c.IsInternal);
        }

        var logs = await query.OrderBy(c => c.RecordedAt).ToListAsync();
        var medicalDone = logs.FirstOrDefault(c => c.CareType == CareLogTypes.MedicalDone);
        var closed = logs.FirstOrDefault(c => c.CareType == CareLogTypes.Close);

        return new CareLogDayDto
        {
            ElderlyId = elderly.ElderlyId,
            ElderlyName = elderly.FullName,
            Date = date,
            IsMedicalDone = medicalDone != null,
            MedicalDoneAt = medicalDone?.RecordedAt,
            IsClosed = closed != null,
            ClosedAt = closed?.RecordedAt,
            ClosedBy = closed?.Staff?.User?.FullName,
            Entries = logs.Select(ToEntryDto).ToList()
        };
    }

    public static CareLogEntryDto ToEntryDto(CareLog log) => new()
    {
        CareLogId = log.CareLogId,
        ElderlyId = log.ElderlyId,
        CareType = log.CareType,
        Description = log.Description,
        Notes = log.Notes,
        Data = ParseJson(log.Data),
        IsInternal = log.IsInternal,
        CenterActivityId = log.CenterActivityId,
        ActivityName = log.CenterActivity?.ActivityName,
        RecordedAt = log.RecordedAt,
        StaffId = log.StaffId,
        StaffName = log.Staff?.User?.FullName ?? string.Empty,
        JobTitle = log.Staff?.JobTitle ?? string.Empty,
        Photos = log.CareLogPhotos.OrderBy(p => p.UploadedAt).Select(ToPhotoDto).ToList()
    };

    public static CareLogPhotoDto ToPhotoDto(CareLogPhoto photo) => new()
    {
        PhotoId = photo.CareLogPhotoId,
        CareLogId = photo.CareLogId,
        Url = photo.FileUrl,
        UploadedAt = photo.UploadedAt
    };

    public static IncidentDto ToIncidentDto(IncidentReport incident) => new()
    {
        IncidentId = incident.IncidentId,
        ElderlyId = incident.ElderlyId,
        ElderlyName = incident.Elderly?.FullName ?? string.Empty,
        IncidentType = incident.IncidentType,
        Severity = incident.Severity,
        Description = incident.Description,
        OccurredAt = incident.OccurredAt,
        ReportedAt = incident.ReportedAt,
        ReportedByName = incident.ReportedByNavigation?.User?.FullName ?? string.Empty,
        Status = incident.Status,
        ResolutionNotes = incident.ResolutionNotes,
        ResolvedAt = incident.ResolvedAt
    };

    public static DoseDto ToDoseDto(MedicationRecord record) => new()
    {
        MedicationRecordId = record.MedicationRecordId,
        MedicationPlanId = record.MedicationPlanId,
        ElderlyId = record.MedicationPlan.ElderlyId,
        ElderlyName = record.MedicationPlan.Elderly?.FullName ?? string.Empty,
        MedicationName = record.MedicationPlan.MedicationName,
        Dosage = record.MedicationPlan.Dosage,
        Instructions = record.MedicationPlan.Instructions,
        ScheduledAt = record.ScheduledAt,
        Status = record.Status,
        StatusLabel = DoseStatuses.Label(record.Status),
        RecordedAt = record.RecordedAt,
        Notes = record.Notes,
        StaffName = record.Staff?.User?.FullName ?? string.Empty
    };

    /// <summary>
    /// Thêm thông báo cho các thành viên gia đình nhận thông báo của cụ (chưa SaveChanges)
    /// </summary>
    public static async Task NotifyFamilyAsync(AppDbContext context, Guid elderlyId, string title, string message,
        string notificationType, string? relatedEntityType, Guid? relatedEntityId)
    {
        var userIds = await context.ElderlyFamilyRelationships
            .Where(r => r.ElderlyId == elderlyId && r.CanReceiveNotifications)
            .Select(r => r.FamilyMember.UserId)
            .Distinct()
            .ToListAsync();

        foreach (var userId in userIds)
        {
            await context.Notifications.AddAsync(new Notification
            {
                NotificationId = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Message = message,
                NotificationType = notificationType,
                RelatedEntityType = relatedEntityType,
                RelatedEntityId = relatedEntityId,
                IsRead = false,
                CreatedAt = VietnamTime.Now
            });
        }
    }

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
