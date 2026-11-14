namespace DayCareElderlyService.Models.Entities;

// Bổ sung cho các tính năng vận hành (Đợt 2–4):
// sự cố chi tiết + trừ vật tư, hồ sơ nhân viên, người được đón, báo vắng, đơn nghỉ / đổi ca.
// Cấu hình EF nằm trong Data/AppDbContext.Operations.cs; schema: migration AddOperationsFeatures
// và script Migrations/Apply_AddOperationsFeatures.sql.

public partial class IncidentReport
{
    /// <summary>Nhân viên trực tiếp xử lý sự cố (SR-33: HandledBy)</summary>
    public int? HandledBy { get; set; }

    /// <summary>Các bước đã xử lý / sơ cứu</summary>
    public string? HandlingActions { get; set; }

    /// <summary>Chuyển viện: tên bệnh viện, thời điểm, nhân viên đi cùng</summary>
    public string? HospitalName { get; set; }
    public DateTime? HospitalTransferAt { get; set; }
    public string? HospitalEscort { get; set; }

    /// <summary>Danh sách URL ảnh (JSON array) — ảnh lưu trên Cloudinary</summary>
    public string? PhotoUrls { get; set; }

    /// <summary>Tổng phí vật tư tính riêng cho gia đình (F-14, WF-05)</summary>
    public decimal SupplyChargeAmount { get; set; }

    public virtual User? HandledByNavigation { get; set; }
    public virtual ICollection<SupplyTransaction> SupplyTransactions { get; set; } = new List<SupplyTransaction>();
}

public partial class SupplyTransaction
{
    /// <summary>Sự cố đã dùng vật tư này (null nếu là nhập / xuất kho thường)</summary>
    public int? IncidentId { get; set; }

    /// <summary>Đơn giá tại thời điểm dùng — để tính phí riêng</summary>
    public decimal? UnitPrice { get; set; }

    public virtual IncidentReport? Incident { get; set; }
}

public partial class MedicalSupply
{
    /// <summary>Đơn giá tính cho gia đình khi dùng trong sự cố</summary>
    public decimal UnitPrice { get; set; }

    /// <summary>Hạn dùng (SR-04)</summary>
    public DateOnly? ExpiryDate { get; set; }
}

public partial class AttendanceRecord
{
    /// <summary>Người được ủy quyền đã đón cụ lúc check-out (BR-30)</summary>
    public int? PickupPersonId { get; set; }

    public virtual AuthorizedPickupPerson? PickupPerson { get; set; }
}

/// <summary>Hồ sơ nghề nghiệp của nhân viên (F-04): chức vụ, chứng chỉ, ngày vào làm</summary>
public class StaffProfile
{
    public int UserId { get; set; }
    public string? Position { get; set; }
    public string? Qualification { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public virtual User User { get; set; } = null!;
}

/// <summary>Người được ủy quyền đón cụ (BR-30)</summary>
public class AuthorizedPickupPerson
{
    public int PickupPersonId { get; set; }
    public int ElderlyId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Relationship { get; set; }
    public string PhoneNumber { get; set; } = null!;
    /// <summary>4 số cuối CCCD — nhân viên đối chiếu khi đón</summary>
    public string IdCardLast4 { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;
}

/// <summary>Gia đình báo vắng cho một ngày (SR-32)</summary>
public class AbsenceReport
{
    public int AbsenceId { get; set; }
    public int ElderlyId { get; set; }
    public DateOnly AbsenceDate { get; set; }
    public string? Reason { get; set; }
    public int ReportedBy { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual ElderlyMember Elderly { get; set; } = null!;
    public virtual User ReportedByNavigation { get; set; } = null!;
}

/// <summary>Đơn xin nghỉ / đổi ca của nhân viên, Manager duyệt (SRS 3.10.2)</summary>
public class StaffRequest
{
    public int RequestId { get; set; }
    public int StaffId { get; set; }
    /// <summary>"Leave" | "ShiftChange"</summary>
    public string RequestType { get; set; } = null!;
    public DateOnly RequestDate { get; set; }
    /// <summary>Đổi ca: nhân viên làm thay</summary>
    public int? SwapWithStaffId { get; set; }
    public string? Reason { get; set; }
    /// <summary>"Pending" | "Approved" | "Rejected"</summary>
    public string Status { get; set; } = "Pending";
    public int? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User Staff { get; set; } = null!;
    public virtual User? SwapWithStaff { get; set; }
    public virtual User? Reviewer { get; set; }
}
