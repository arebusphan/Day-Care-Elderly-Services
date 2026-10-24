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

    /// <summary>Các loại staff ghi tay qua POST /api/staff/care-logs/{elderlyId}</summary>
    public static readonly string[] Manual = { Meal, Hygiene, Nap, Mood, Activity, Note };
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
