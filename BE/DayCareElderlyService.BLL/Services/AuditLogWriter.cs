using System.Text.Json;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Services;

internal static class AuditLogWriter
{
    public static async Task WriteAsync(
        AppDbContext context,
        int? actorUserId,
        string action,
        string entityName,
        string? entityId,
        object? details = null)
    {
        context.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityName = entityName,
            EntityId = entityId,
            Details = details == null ? null : JsonSerializer.Serialize(details),
            CreatedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }
}
