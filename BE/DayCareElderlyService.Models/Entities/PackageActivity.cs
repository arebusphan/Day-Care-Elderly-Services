using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class PackageActivity
{
    public int PackageActivityId { get; set; }

    public int PackageId { get; set; }

    public int? ActivityTemplateId { get; set; }

    public byte? DayOfWeek { get; set; }

    public TimeOnly StartTime { get; set; }

    public TimeOnly EndTime { get; set; }

    public int DisplayOrder { get; set; }

    public bool IsActive { get; set; }

    // Lịch hoạt động theo gói (Apply_AddPackageActivitySchedule.sql)
    public string ActivityName { get; set; } = string.Empty;

    /// <summary>Hoạt động này dùng để làm gì cho cụ</summary>
    public string? Purpose { get; set; }

    /// <summary>Loại care log khi ghi: MEAL, ACTIVITY, VITALS, MOOD, NAP, HYGIENE, NOTE</summary>
    public string CareType { get; set; } = "ACTIVITY";

    public int? TargetMinutes { get; set; }

    /// <summary>Nurse | Caregiver | Any</summary>
    public string PerformerRole { get; set; } = "Any";

    public bool IsRequired { get; set; } = true;

    /// <summary>null = mọi cụ của gói; DIABETES / HYPERTENSION / HEART = chỉ cụ có bệnh nền đó</summary>
    public string? ConditionCode { get; set; }

    /// <summary>Nguồn nghiên cứu (WHO, NICE…)</summary>
    public string? Source { get; set; }

    public virtual ServicePackage Package { get; set; } = null!;

    public virtual ICollection<CareLog> CareLogs { get; set; } = new List<CareLog>();
}
