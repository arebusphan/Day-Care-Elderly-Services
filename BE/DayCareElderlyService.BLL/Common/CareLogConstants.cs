namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Giá trị cột CareLogs.CareType
/// </summary>
public static class CareLogTypes
{
    public const string Meal = "MEAL";
    public const string Hygiene = "HYGIENE";
    public const string Nap = "NAP";
    public const string Mood = "MOOD";
    public const string Activity = "ACTIVITY";
    public const string Note = "NOTE";
    public const string Vitals = "VITALS";
    public const string Medication = "MEDICATION";
    public const string MedicalDone = "MEDICAL_DONE";
    public const string Close = "CLOSE";
    /// <summary>Bỏ qua 1 hoạt động trong lịch (bắt buộc kèm PackageActivityId + lý do)</summary>
    public const string Skip = "SKIP";

    /// <summary>Các loại staff ghi tay qua POST /api/staff/care-logs/{elderlyId}</summary>
    public static readonly string[] Manual = { Meal, Hygiene, Nap, Mood, Activity, Note };

    /// <summary>Loại care log được dùng cho 1 hoạt động trong lịch của gói</summary>
    public static readonly string[] Schedulable = { Meal, Hygiene, Nap, Mood, Activity, Note, Vitals };
}

/// <summary>
/// Mã bệnh nền (ElderlyMembers.ChronicConditions, PackageActivities.ConditionCode)
/// </summary>
public static class ChronicConditionCodes
{
    public const string Diabetes = "DIABETES";
    public const string Hypertension = "HYPERTENSION";
    public const string Heart = "HEART";

    public static readonly string[] All = { Diabetes, Hypertension, Heart };

    public static HashSet<string> Parse(string? value) =>
        (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(c => c.ToUpperInvariant())
            .Where(c => All.Contains(c))
            .ToHashSet();

    /// <summary>Chuẩn hóa danh sách mã; trả về null nếu rỗng</summary>
    public static string? Join(IEnumerable<string>? codes)
    {
        var list = (codes ?? Array.Empty<string>())
            .Select(c => c.Trim().ToUpperInvariant())
            .Where(c => All.Contains(c))
            .Distinct()
            .OrderBy(c => Array.IndexOf(All, c))
            .ToList();
        return list.Count == 0 ? null : string.Join(",", list);
    }
}

/// <summary>Người thực hiện 1 hoạt động trong lịch</summary>
public static class PerformerRoles
{
    public const string Nurse = "Nurse";
    public const string Caregiver = "Caregiver";
    public const string Any = "Any";

    public static readonly string[] All = { Nurse, Caregiver, Any };
}

/// <summary>Trạng thái 1 hoạt động trong lịch ngày (tính từ CareLogs, không lưu)</summary>
public static class ScheduleStatuses
{
    public const string Done = "Done";
    public const string Skipped = "Skipped";
    public const string Overdue = "Overdue";
    public const string Pending = "Pending";
}

/// <summary>
/// Giá trị cột IncidentReports.IncidentType do hệ thống care log tạo
/// </summary>
public static class IncidentTypes
{
    public const string VitalsAlert = "VITALS_ALERT";
    public const string Stroke = "STROKE";
    public const string Lost = "LOST";

    /// <summary>Loại khẩn cấp: luôn ở mức Critical</summary>
    public static readonly string[] Urgent = { Stroke, Lost };
}

public static class IncidentSeverities
{
    public const string Low = "Low";
    public const string Medium = "Medium";
    public const string High = "High";
    public const string Critical = "Critical";

    public static readonly string[] All = { Low, Medium, High, Critical };

    public static int Rank(string? severity) => Array.IndexOf(All, severity);
}

public static class IncidentStatuses
{
    public const string Open = "Open";
    public const string InProgress = "InProgress";
    public const string Resolved = "Resolved";
}

public static class DoseStatuses
{
    public const string Pending = "Pending";
    public const string Given = "Given";
    public const string Refused = "Refused";
    public const string Missed = "Missed";

    public static string Label(string status) => status switch
    {
        Given => "Đã uống",
        Refused => "Từ chối uống",
        Missed => "Thiếu thuốc",
        _ => "Chưa uống"
    };
}

/// <summary>
/// Phân biệt chức danh qua cột Staff.JobTitle
/// </summary>
public static class StaffTitles
{
    public static bool IsNurse(string? jobTitle) =>
        Has(jobTitle, "Điều dưỡng") || Has(jobTitle, "Nurse");

    public static bool IsCaregiver(string? jobTitle) =>
        Has(jobTitle, "Hộ lý") || Has(jobTitle, "Caregiver");

    private static bool Has(string? jobTitle, string keyword) =>
        jobTitle != null && jobTitle.Contains(keyword, StringComparison.OrdinalIgnoreCase);
}
