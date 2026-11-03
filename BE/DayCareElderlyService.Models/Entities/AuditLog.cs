namespace DayCareElderlyService.Models.Entities;

public partial class AuditLog
{
    public long AuditLogId { get; set; }

    public int? ActorUserId { get; set; }

    public string Action { get; set; } = null!;

    public string EntityName { get; set; } = null!;

    public string? EntityId { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? ActorUser { get; set; }
}
