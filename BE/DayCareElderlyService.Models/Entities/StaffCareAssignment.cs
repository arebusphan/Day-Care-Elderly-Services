using System;

namespace DayCareElderlyService.Models.Entities;

/// <summary>
/// Chi tiết phân công một người cao tuổi vào group của một nhân viên trong ngày
/// </summary>
public partial class StaffCareAssignment
{
    public int AssignmentId { get; set; }

    public int PlanId { get; set; }

    public int StaffId { get; set; }

    public int ElderlyId { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual DailySchedulePlan Plan { get; set; } = null!;

    public virtual User Staff { get; set; } = null!;

    public virtual ElderlyMember Elderly { get; set; } = null!;
}

