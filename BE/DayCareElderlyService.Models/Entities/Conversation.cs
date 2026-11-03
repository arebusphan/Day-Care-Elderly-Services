namespace DayCareElderlyService.Models.Entities;

public partial class Conversation
{
    public int ConversationId { get; set; }

    public int ElderlyId { get; set; }

    public int FamilyUserId { get; set; }

    public int StaffUserId { get; set; }

    public bool IsClosed { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? LastMessageAt { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;

    public virtual User FamilyUser { get; set; } = null!;

    public virtual User StaffUser { get; set; } = null!;

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
