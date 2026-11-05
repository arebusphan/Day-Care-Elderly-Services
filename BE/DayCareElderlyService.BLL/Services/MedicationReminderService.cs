using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class MedicationReminderService : IMedicationReminderService
{
    public const string NotificationType = "MedicationDue";
    public const string RelatedEntityType = nameof(MedicationRecord);

    private const int LeadMinutes = 5;
    private const int GraceMinutes = 30;

    private readonly AppDbContext _context;

    public MedicationReminderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<int> ProcessDueDosesAsync(CancellationToken cancellationToken = default)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);

        var now = VietnamTime.Now;
        var windowFrom = now.AddMinutes(-GraceMinutes);
        var windowTo = now.AddMinutes(LeadMinutes);

        var dueDoses = await _context.MedicationRecords
            .Include(r => r.MedicationPlan).ThenInclude(p => p.Elderly)
            .Where(r => r.Status == DoseStatuses.Pending
                     && r.MedicationPlan.IsActive
                     && r.ScheduledAt >= windowFrom
                     && r.ScheduledAt <= windowTo)
            .ToListAsync(cancellationToken);

        if (dueDoses.Count == 0)
        {
            return 0;
        }

        var recordIds = dueDoses.Select(r => r.MedicationRecordId).ToList();
        var alreadyNotified = await _context.Notifications
            .Where(n => n.NotificationType == NotificationType
                     && n.RelatedEntityType == RelatedEntityType
                     && n.RelatedEntityId != null
                     && recordIds.Contains(n.RelatedEntityId.Value))
            .Select(n => n.RelatedEntityId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);
        var notifiedSet = alreadyNotified.ToHashSet();

        var today = VietnamTime.Today;
        var elderlyIds = dueDoses.Select(r => r.MedicationPlan.ElderlyId).Distinct().ToList();
        var assignedStaffByElderly = await _context.StaffCareAssignments
            .Where(a => a.Plan.PlanDate == today && elderlyIds.Contains(a.ElderlyId))
            .Select(a => new { a.ElderlyId, a.StaffId })
            .ToListAsync(cancellationToken);

        var staffLookup = assignedStaffByElderly
            .GroupBy(x => x.ElderlyId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.StaffId).Distinct().ToList());

        List<int>? fallbackStaffIds = null;
        var created = 0;

        foreach (var dose in dueDoses)
        {
            if (notifiedSet.Contains(dose.MedicationRecordId))
            {
                continue;
            }

            if (!staffLookup.TryGetValue(dose.MedicationPlan.ElderlyId, out var staffIds) || staffIds.Count == 0)
            {
                fallbackStaffIds ??= await GetAllActiveStaffIdsAsync(cancellationToken);
                staffIds = fallbackStaffIds;
            }

            if (staffIds.Count == 0)
            {
                continue;
            }

            var elderlyName = dose.MedicationPlan.Elderly?.FullName ?? "Người cao tuổi";
            var title = $"Đến giờ uống thuốc: {elderlyName}";
            var message =
                $"{dose.MedicationPlan.MedicationName} {dose.MedicationPlan.Dosage} lúc {dose.ScheduledAt:HH:mm}."
                + (string.IsNullOrWhiteSpace(dose.MedicationPlan.Instructions)
                    ? string.Empty
                    : $" Hướng dẫn: {dose.MedicationPlan.Instructions}");

            foreach (var staffId in staffIds)
            {
                await _context.Notifications.AddAsync(new Notification
                {
                    UserId = staffId,
                    Title = title,
                    Message = message,
                    NotificationType = NotificationType,
                    RelatedEntityType = RelatedEntityType,
                    RelatedEntityId = dose.MedicationRecordId,
                    IsRead = false,
                    CreatedAt = now
                }, cancellationToken);
                created++;
            }

            notifiedSet.Add(dose.MedicationRecordId);
        }

        if (created > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return created;
    }

    private Task<List<int>> GetAllActiveStaffIdsAsync(CancellationToken cancellationToken) =>
        _context.Users
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .Select(u => u.UserId)
            .ToListAsync(cancellationToken);
}
