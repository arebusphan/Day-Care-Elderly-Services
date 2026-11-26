using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Schedule;

/// <summary>Gói dịch vụ + số hoạt động đang dùng trong lịch (để chọn gói trên màn quản lý lịch)</summary>
public class PackageScheduleSummaryDto
{
    public int PackageId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int ActivityCount { get; set; }
}

/// <summary>1 hoạt động trong lịch mẫu của gói (PackageActivities)</summary>
public class PackageActivityDto
{
    public int PackageActivityId { get; set; }
    public int PackageId { get; set; }
    /// <summary>null = mọi ngày T2–T7; 1 = Thứ 2 … 6 = Thứ 7</summary>
    public int? DayOfWeek { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string ActivityName { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public string CareType { get; set; } = string.Empty;
    public int? TargetMinutes { get; set; }
    public string PerformerRole { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public string? ConditionCode { get; set; }
    public string? Source { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>Thêm / sửa 1 hoạt động trong lịch mẫu</summary>
public class UpsertPackageActivityDto
{
    [Range(1, 6, ErrorMessage = "Thứ phải từ 1 (Thứ 2) đến 6 (Thứ 7); để trống = mọi ngày.")]
    public int? DayOfWeek { get; set; }

    [Required(ErrorMessage = "Vui lòng nhập giờ bắt đầu.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Giờ bắt đầu dạng HH:mm.")]
    public string StartTime { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập giờ kết thúc.")]
    [RegularExpression(@"^([01]\d|2[0-3]):[0-5]\d$", ErrorMessage = "Giờ kết thúc dạng HH:mm.")]
    public string EndTime { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập tên hoạt động.")]
    [StringLength(150, ErrorMessage = "Tên hoạt động tối đa 150 ký tự.")]
    public string ActivityName { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Mục đích tối đa 500 ký tự.")]
    public string? Purpose { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn loại care log.")]
    public string CareType { get; set; } = "ACTIVITY";

    [Range(1, 480, ErrorMessage = "Số phút mục tiêu từ 1 đến 480.")]
    public int? TargetMinutes { get; set; }

    public string PerformerRole { get; set; } = "Any";

    public bool IsRequired { get; set; } = true;

    public string? ConditionCode { get; set; }

    [StringLength(200, ErrorMessage = "Nguồn tối đa 200 ký tự.")]
    public string? Source { get; set; }
}

/// <summary>1 hoạt động trong lịch ngày của 1 cụ, kèm trạng thái</summary>
public class ScheduleItemDto
{
    public int PackageActivityId { get; set; }
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public string ActivityName { get; set; } = string.Empty;
    public string? Purpose { get; set; }
    public string CareType { get; set; } = string.Empty;
    public int? TargetMinutes { get; set; }
    public string PerformerRole { get; set; } = string.Empty;
    public bool IsRequired { get; set; }
    public string? ConditionCode { get; set; }
    /// <summary>Done | Skipped | Overdue | Pending</summary>
    public string Status { get; set; } = string.Empty;
    public int? CareLogId { get; set; }
    public DateTime? RecordedAt { get; set; }
    public string? StaffName { get; set; }
    /// <summary>Nội dung đã ghi, hoặc lý do bỏ qua</summary>
    public string? Note { get; set; }
}

public class ScheduleDayDto
{
    public int ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public int? PackageId { get; set; }
    public string? PackageName { get; set; }
    public List<string> ChronicConditions { get; set; } = new();
    public int RequiredCount { get; set; }
    public int DoneCount { get; set; }
    public int SkippedCount { get; set; }
    public List<ScheduleItemDto> Items { get; set; } = new();
}

/// <summary>Tổng kết 1 hoạt động trong tuần (T2–T7 chứa ngày đã chọn)</summary>
public class ScheduleWeekItemDto
{
    public string ActivityName { get; set; } = string.Empty;
    public int PlannedSessions { get; set; }
    public int DoneSessions { get; set; }
    public int SkippedSessions { get; set; }
    public int PlannedMinutes { get; set; }
    public int DoneMinutes { get; set; }
}

public class ScheduleWeekDto
{
    public int ElderlyId { get; set; }
    public DateOnly WeekStart { get; set; }
    public DateOnly WeekEnd { get; set; }
    public string? PackageName { get; set; }
    /// <summary>Tổng phút vận động (ACTIVITY có phút mục tiêu) đã làm / dự kiến cả tuần</summary>
    public int ActivityMinutesDone { get; set; }
    public int ActivityMinutesPlanned { get; set; }
    public List<ScheduleWeekItemDto> Items { get; set; } = new();
}
