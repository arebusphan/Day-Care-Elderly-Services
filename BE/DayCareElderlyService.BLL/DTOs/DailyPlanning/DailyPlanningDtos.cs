using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using DayCareElderlyService.BLL.DTOs.StaffSchedule;

namespace DayCareElderlyService.BLL.DTOs.DailyPlanning;

// ── Step 1: Attendance Forecast ────────────────────────────────────────────

public class AttendanceForecastItemDto
{
    public int ElderlyId { get; set; }
    public string MemberCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? MobilityStatus { get; set; }
    public string? Gender { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? ServicePackageName { get; set; }
    public string? CareGroupName { get; set; }
    /// <summary>"Expected" | "Absent" | "NotConfirmed"</summary>
    public string AttendanceStatus { get; set; } = "Expected";
    public string? Reason { get; set; }
}

public class UpdateAttendanceDto
{
    [Required]
    public int ElderlyId { get; set; }
    [Required]
    public string AttendanceStatus { get; set; } = "Expected";
    public string? Reason { get; set; }
}

public class BulkUpdateAttendanceDto
{
    [Required]
    public List<UpdateAttendanceDto> Updates { get; set; } = new();
}

public class AttendanceForecastResultDto
{
    public int PlanId { get; set; }
    public DateOnly PlanDate { get; set; }
    public string PlanStatus { get; set; } = "Draft";
    public int TotalExpected { get; set; }
    public int TotalAbsent { get; set; }
    public int TotalNotConfirmed { get; set; }
    public int TotalNormal { get; set; }
    public int TotalSupport { get; set; }
    public List<AttendanceForecastItemDto> Items { get; set; } = new();
}

// ── Step 2: Group Arrangement ──────────────────────────────────────────────

public class GroupMemberItemDto
{
    public int ElderlyId { get; set; }
    public string MemberCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string MobilityStatus { get; set; } = "Normal";
    public string? ServicePackageName { get; set; }
}

public class CareGroupDetailDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string GroupType { get; set; } = "Normal";
    public int MaxCapacity => GroupType == "Support" ? 4 : 10;
    public int? StaffId { get; set; }
    public string? StaffName { get; set; }
    public List<GroupMemberItemDto> Members { get; set; } = new();
    public int CurrentCount => Members.Count;
    public bool IsFull => CurrentCount >= MaxCapacity;
}

public class GroupArrangementResultDto
{
    public int PlanId { get; set; }
    public List<CareGroupDetailDto> NormalGroups { get; set; } = new();
    public List<CareGroupDetailDto> SupportGroups { get; set; } = new();
    public List<GroupMemberItemDto> Unassigned { get; set; } = new();
}

public class MoveElderlyToGroupDto
{
    [Required] public int ElderlyId { get; set; }
    [Required] public int TargetGroupId { get; set; }
}

public class CreateCareGroupDto
{
    [Required(ErrorMessage = "Tên nhóm là bắt buộc.")]
    [StringLength(100)]
    public string GroupName { get; set; } = string.Empty;

    [Required]
    public string GroupType { get; set; } = "Normal"; // "Normal" | "Support"
}

// ── Step 3: Staff Availability ─────────────────────────────────────────────

public class StaffAvailabilityItemDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    /// <summary>"Working" | "Off" | "Leave"</summary>
    public string Availability { get; set; } = "Working";
    public string? Note { get; set; }
}

public class UpdateStaffAvailabilityDto
{
    [Required] public int StaffId { get; set; }
    [Required] public string Availability { get; set; } = "Working";
    public string? Note { get; set; }
}

public class BulkUpdateStaffAvailabilityDto
{
    [Required] public List<UpdateStaffAvailabilityDto> Updates { get; set; } = new();
}

public class StaffAvailabilityResultDto
{
    public DateOnly Date { get; set; }
    public int TotalWorking { get; set; }
    public int TotalOff { get; set; }
    public int TotalLeave { get; set; }
    public int RequiredNormalStaff { get; set; }
    public int RequiredSupportStaff { get; set; }
    public bool HasEnoughStaff { get; set; }
    public List<StaffAvailabilityItemDto> Staff { get; set; } = new();
}

// ── Step 4: Staff Assignment ───────────────────────────────────────────────

public class AssignStaffToGroupDto
{
    [Required] public int GroupId { get; set; }
    public int? StaffId { get; set; }
}

// ── Step 5: Review & Publish ───────────────────────────────────────────────

public class AttendanceSummaryBlockDto
{
    public int TotalExpected { get; set; }
    public int TotalAbsent { get; set; }
    public int TotalNotConfirmed { get; set; }
    public int TotalNormal { get; set; }
    public int TotalSupport { get; set; }
}

public class GroupSummaryItemDto
{
    public int GroupId { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public string GroupType { get; set; } = "Normal";
    public int CurrentCount { get; set; }
    public int MaxCapacity { get; set; }
    public string? StaffName { get; set; }
    public bool IsFull => CurrentCount >= MaxCapacity;
}

public class StaffSummaryBlockDto
{
    public int TotalWorking { get; set; }
    public int TotalOff { get; set; }
    public int TotalLeave { get; set; }
    public int TotalAssigned { get; set; }
    public int TotalUnassigned => Math.Max(0, TotalWorking - TotalAssigned);
}

public class DailyPlanSummaryDto
{
    public int PlanId { get; set; }
    public DateOnly PlanDate { get; set; }
    public string Status { get; set; } = "Draft";
    public string StatusLabel => Status switch
    {
        "Draft" => "Bản nháp",
        "ReadyToReview" => "Chờ duyệt",
        "Published" => "Đã công bố",
        _ => Status
    };
    public int TotalAttending { get; set; }
    public int TotalNormal { get; set; }
    public int TotalSupport { get; set; }
    public int TotalWorkingStaff { get; set; }
    public int TotalGroups { get; set; }
    public int TotalAssigned { get; set; }
    public int TotalUnassigned { get; set; }

    // 4 khối Summary chi tiết theo yêu cầu Step 5:
    public AttendanceSummaryBlockDto AttendanceSummary { get; set; } = new();
    public List<GroupSummaryItemDto> GroupSummary { get; set; } = new();
    public StaffSummaryBlockDto StaffSummary { get; set; } = new();
    public List<StaffCareGroupDto> AssignmentSummary { get; set; } = new();

    public List<string> Warnings { get; set; } = new();
    public DateTime? PublishedAt { get; set; }
    public string? PublishedByName { get; set; }
}

public class PlanHistoryItemDto
{
    public int PlanId { get; set; }
    public DateOnly PlanDate { get; set; }
    public string Status { get; set; } = "Draft";
    public string StatusLabel => Status switch
    {
        "Draft" => "Bản nháp",
        "ReadyToReview" => "Chờ duyệt",
        "Confirmed" => "Đã xác nhận",
        "Published" => "Đã công bố",
        _ => Status
    };
    public int TotalElderly { get; set; }
    public int TotalStaff { get; set; }
    public int TotalGroups { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? ConfirmedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Notes { get; set; }
}
