namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Một hoạt động trong lịch hôm nay của trung tâm (1 dòng CenterActivities)
/// </summary>
public class ActivityTodayDto
{
    public Guid CenterActivityId { get; set; }
    public string ActivityName { get; set; } = string.Empty;
    public DateOnly ActivityDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;

    /// <summary>Nhân viên đang đăng nhập có được phân công hoạt động này không</summary>
    public bool IsAssignedToMe { get; set; }
    public string? MyAssignmentRole { get; set; }
    public List<string> AssignedStaff { get; set; } = new();

    /// <summary>Số mục care log đã gắn với hoạt động này</summary>
    public int EntryCount { get; set; }
}
