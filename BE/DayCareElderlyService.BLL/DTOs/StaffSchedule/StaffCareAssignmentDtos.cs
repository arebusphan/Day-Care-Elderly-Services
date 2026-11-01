using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.StaffSchedule;

/// <summary>
/// Yêu cầu tự động chia lịch cho nhân viên theo ngày
/// </summary>
public class AutoAssignScheduleRequestDto
{
    /// <summary>
    /// Ngày cần chia lịch (Mặc định: ngày mai)
    /// </summary>
    public DateOnly? TargetDate { get; set; }

    /// <summary>
    /// Ghi chú cho đợt chia lịch
    /// </summary>
    [StringLength(1000, ErrorMessage = "Ghi chú không được vượt quá 1000 ký tự.")]
    public string? Notes { get; set; }
}

/// <summary>
/// Thông tin người cao tuổi trong group chăm sóc của nhân viên
/// </summary>
public class ElderlyInGroupDto
{
    public int ElderlyId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    /// <summary>
    /// "Normal" hoặc "Support"
    /// </summary>
    public string MobilityStatus { get; set; } = "Normal";

    public string? CareNotes { get; set; }

    public string? EmergencyContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    public int? AssignmentId { get; set; }

    public string? AssignmentNotes { get; set; }
}

/// <summary>
/// Group người cao tuổi được chia cho một nhân viên quản lý
/// Tách biệt rõ 2 loại nhóm: Normal (tối đa 10 người) và Support (tối đa 4 người)
/// </summary>
public class StaffCareGroupDto
{
    public int? GroupId { get; set; }

    public string GroupName { get; set; } = string.Empty;

    /// <summary>
    /// Loại nhóm: "Normal" hoặc "Support"
    /// </summary>
    public string GroupType { get; set; } = "Normal";

    public int? StaffId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Định mức tối đa của nhóm (10 đối với Normal, 4 đối với Support)
    /// </summary>
    public int MaxCapacity => GroupType == "Support" ? 4 : 10;

    /// <summary>
    /// Tổng số cụ trong nhóm hiện tại
    /// </summary>
    public int ElderlyCount => ElderlyList.Count;

    /// <summary>
    /// Số lượng người cao tuổi bình thường
    /// </summary>
    public int NormalElderlyCount { get; set; }

    /// <summary>
    /// Số lượng người cao tuổi cần hỗ trợ
    /// </summary>
    public int NeedSupportElderlyCount { get; set; }

    public int TotalElderlyCount => ElderlyList.Count;

    /// <summary>
    /// Cảnh báo vượt quá định mức của nhóm
    /// </summary>
    public bool IsExceeded => ElderlyCount > MaxCapacity;

    /// <summary>
    /// Cảnh báo vượt quá định mức 10 người bình thường
    /// </summary>
    public bool IsNormalExceeded => GroupType == "Normal" && ElderlyCount > 10;

    /// <summary>
    /// Cảnh báo vượt quá định mức 4 người cần hỗ trợ
    /// </summary>
    public bool IsNeedSupportExceeded => GroupType == "Support" && ElderlyCount > 4;

    /// <summary>
    /// Danh sách người cao tuổi trong group này
    /// </summary>
    public List<ElderlyInGroupDto> ElderlyList { get; set; } = new();
}

/// <summary>
/// Kế hoạch phân công chăm sóc chi tiết trong ngày (phục vụ Center xem lại, chỉnh sửa và xác nhận)
/// </summary>
public class DailySchedulePlanDto
{
    public int PlanId { get; set; }

    public int CenterId { get; set; }

    public DateOnly PlanDate { get; set; }

    /// <summary>
    /// "Draft" (Bản nháp / Vừa chia xong) hoặc "Confirmed" (Đã xác nhận)
    /// </summary>
    public string Status { get; set; } = "Draft";

    public string StatusText => Status == "Confirmed" ? "Đã xác nhận" : "Bản nháp (Chờ xác nhận)";

    public DateTime? ConfirmedAt { get; set; }

    public string? ConfirmedByName { get; set; }

    public int TotalStaff { get; set; }

    public int TotalElderly { get; set; }

    public int TotalNormal { get; set; }

    public int TotalNeedSupport { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// Danh sách các nhóm phân công theo từng nhân viên
    /// </summary>
    public List<StaffCareGroupDto> Groups { get; set; } = new();

    /// <summary>
    /// Danh sách các cụ chưa được phân công (nếu có, do thiếu nhân viên)
    /// </summary>
    public List<ElderlyInGroupDto> UnassignedElderly { get; set; } = new();

    /// <summary>
    /// Các cảnh báo về định mức hoặc thiếu nhân sự
    /// </summary>
    public List<string> Warnings { get; set; } = new();
}

/// <summary>
/// Yêu cầu chỉnh sửa: chuyển người cao tuổi sang staff khác
/// </summary>
public class ReassignElderlyDto
{
    [Required(ErrorMessage = "Mã kế hoạch là bắt buộc.")]
    public int PlanId { get; set; }

    [Required(ErrorMessage = "Mã người cao tuổi là bắt buộc.")]
    public int ElderlyId { get; set; }

    [Required(ErrorMessage = "Mã nhân viên mới là bắt buộc.")]
    public int NewStaffId { get; set; }

    [StringLength(500, ErrorMessage = "Ghi chú không được vượt quá 500 ký tự.")]
    public string? Notes { get; set; }
}

/// <summary>
/// Yêu cầu xác nhận kế hoạch phân công
/// </summary>
public class ConfirmScheduleDto
{
    [Required(ErrorMessage = "Mã kế hoạch là bắt buộc.")]
    public int PlanId { get; set; }

    [StringLength(1000, ErrorMessage = "Ghi chú không được vượt quá 1000 ký tự.")]
    public string? Notes { get; set; }
}

