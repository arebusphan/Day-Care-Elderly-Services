using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.Services;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Manager cập nhật hồ sơ nhân viên (F-04: chức vụ, chứng chỉ, ngày vào làm)
/// và quản lý hồ sơ người cao tuổi (SRS 3.4.3: xem chi tiết, sửa, vô hiệu hóa / kích hoạt lại).
/// </summary>
[ApiController]
[Route("api/center")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class CenterProfilesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CenterProfilesController(AppDbContext context)
    {
        _context = context;
    }

    // ───────── Hồ sơ nhân viên ─────────

    public class StaffProfileDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public bool IsActive { get; set; }
        public string? Position { get; set; }
        public string? Qualification { get; set; }
        public DateOnly? StartDate { get; set; }
    }

    public class UpdateStaffProfileDto
    {
        [Required(ErrorMessage = "Họ tên không được để trống."), StringLength(150)]
        public string FullName { get; set; } = string.Empty;
        [RegularExpression(@"^(0|\+84)\d{9,10}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
        public string? PhoneNumber { get; set; }
        [StringLength(100)]
        public string? Position { get; set; }
        [StringLength(300)]
        public string? Qualification { get; set; }
        public DateOnly? StartDate { get; set; }
    }

    [HttpGet("staff/{id:int}/profile")]
    public async Task<IActionResult> GetStaffProfile(int id)
    {
        var dto = await LoadStaffProfileAsync(id);
        return dto == null
            ? NotFound(ApiResponse<StaffProfileDto>.Fail("Không tìm thấy nhân viên."))
            : Ok(ApiResponse<StaffProfileDto>.Ok(dto, "Lấy hồ sơ nhân viên thành công."));
    }

    [HttpPut("staff/{id:int}/profile")]
    public async Task<IActionResult> UpdateStaffProfile(int id, [FromBody] UpdateStaffProfileDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ValidationFail<StaffProfileDto>());
        if (dto.StartDate.HasValue && dto.StartDate.Value > VietnamTime.Today.AddYears(1))
            return BadRequest(ApiResponse<StaffProfileDto>.Fail("Ngày vào làm không hợp lệ."));

        var user = await _context.Users.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == id && u.Roles.Any(r => r.RoleName == "Staff"));
        if (user == null) return NotFound(ApiResponse<StaffProfileDto>.Fail("Không tìm thấy nhân viên."));

        user.FullName = dto.FullName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        var profile = await _context.StaffProfiles.FindAsync(id);
        if (profile == null)
        {
            profile = new StaffProfile { UserId = id };
            await _context.StaffProfiles.AddAsync(profile);
        }
        profile.Position = Clean(dto.Position);
        profile.Qualification = Clean(dto.Qualification);
        profile.StartDate = dto.StartDate;
        profile.UpdatedAt = VietnamTime.Now;

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, CurrentUserId(), "UPDATE_STAFF_PROFILE", nameof(StaffProfile), id.ToString(),
            new { dto.FullName, dto.Position, dto.Qualification, dto.StartDate });

        return Ok(ApiResponse<StaffProfileDto>.Ok((await LoadStaffProfileAsync(id))!, "Đã cập nhật hồ sơ nhân viên."));
    }

    private async Task<StaffProfileDto?> LoadStaffProfileAsync(int id)
    {
        var user = await _context.Users.AsNoTracking().Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == id && u.Roles.Any(r => r.RoleName == "Staff"));
        if (user == null) return null;
        var profile = await _context.StaffProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == id);
        return new StaffProfileDto
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsActive = user.IsActive,
            Position = profile?.Position,
            Qualification = profile?.Qualification,
            StartDate = profile?.StartDate
        };
    }

    // ───────── Hồ sơ người cao tuổi (Manager) ─────────

    public class ElderlyDetailDto
    {
        public int ElderlyId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? Allergies { get; set; }
        public string? MedicalHistory { get; set; }
        public string? MedicalNotes { get; set; }
        public string MobilityStatus { get; set; } = "Normal";
        /// <summary>Mã bệnh nền: DIABETES, HYPERTENSION, HEART — dùng để lọc lịch hoạt động</summary>
        public List<string> ChronicConditions { get; set; } = new();
        public string? CareNotes { get; set; }
        public string? EmergencyNotes { get; set; }
        public bool IsActive { get; set; }
        public List<string> FamilyContacts { get; set; } = new();
        public List<string> ActivePackages { get; set; } = new();
        public List<string> AssignedStaffToday { get; set; } = new();
    }

    public class UpdateElderlyByManagerDto
    {
        [Required(ErrorMessage = "Họ tên không được để trống."), StringLength(150)]
        public string FullName { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        [StringLength(20)] public string? Gender { get; set; }
        [StringLength(300)] public string? Address { get; set; }
        [StringLength(150)] public string? EmergencyContactName { get; set; }
        [StringLength(20)] public string? EmergencyContactPhone { get; set; }
        [StringLength(1000)] public string? Allergies { get; set; }
        [StringLength(2000)] public string? MedicalHistory { get; set; }
        [StringLength(2000)] public string? MedicalNotes { get; set; }
        /// <summary>"Normal" | "Support" — nhóm đối tượng do nhân viên xác nhận (BR-79)</summary>
        [Required] public string MobilityStatus { get; set; } = "Normal";
        /// <summary>Mã bệnh nền: DIABETES, HYPERTENSION, HEART. null = giữ nguyên (FE cũ không gửi).</summary>
        public List<string>? ChronicConditions { get; set; }
        [StringLength(2000)] public string? CareNotes { get; set; }
        [StringLength(2000)] public string? EmergencyNotes { get; set; }
    }

    [HttpGet("elderly/{id:int}")]
    public async Task<IActionResult> GetElderlyDetail(int id)
    {
        var dto = await LoadElderlyAsync(id);
        return dto == null
            ? NotFound(ApiResponse<ElderlyDetailDto>.Fail("Không tìm thấy người cao tuổi."))
            : Ok(ApiResponse<ElderlyDetailDto>.Ok(dto, "Lấy hồ sơ thành công."));
    }

    [HttpPut("elderly/{id:int}")]
    public async Task<IActionResult> UpdateElderly(int id, [FromBody] UpdateElderlyByManagerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ValidationFail<ElderlyDetailDto>());
        if (dto.MobilityStatus is not ("Normal" or "Support"))
            return BadRequest(ApiResponse<ElderlyDetailDto>.Fail("Phân loại chỉ nhận Normal hoặc Support."));
        if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value > VietnamTime.Today)
            return BadRequest(ApiResponse<ElderlyDetailDto>.Fail("Ngày sinh không hợp lệ."));

        var e = await _context.ElderlyMembers.FirstOrDefaultAsync(x => x.ElderlyId == id);
        if (e == null) return NotFound(ApiResponse<ElderlyDetailDto>.Fail("Không tìm thấy người cao tuổi."));

        e.FullName = dto.FullName.Trim();
        e.DateOfBirth = dto.DateOfBirth;
        e.Gender = Clean(dto.Gender);
        e.Address = Clean(dto.Address);
        e.EmergencyContactName = Clean(dto.EmergencyContactName);
        e.EmergencyContactPhone = Clean(dto.EmergencyContactPhone);
        e.Allergies = Clean(dto.Allergies);
        e.MedicalHistory = Clean(dto.MedicalHistory);
        e.MedicalNotes = Clean(dto.MedicalNotes);
        e.MobilityStatus = dto.MobilityStatus;
        if (dto.ChronicConditions != null)
        {
            var invalid = dto.ChronicConditions.Where(c => !ChronicConditionCodes.All.Contains(c.Trim().ToUpperInvariant())).ToList();
            if (invalid.Count > 0)
                return BadRequest(ApiResponse<ElderlyDetailDto>.Fail($"Bệnh nền chỉ nhận: {string.Join(", ", ChronicConditionCodes.All)}."));
            e.ChronicConditions = ChronicConditionCodes.Join(dto.ChronicConditions);
        }
        e.CareNotes = Clean(dto.CareNotes);
        e.EmergencyNotes = Clean(dto.EmergencyNotes);
        e.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, CurrentUserId(), "MANAGER_UPDATE_ELDERLY", nameof(ElderlyMember), id.ToString(),
            new { dto.FullName, dto.MobilityStatus, e.ChronicConditions });

        return Ok(ApiResponse<ElderlyDetailDto>.Ok((await LoadElderlyAsync(id))!, "Đã cập nhật hồ sơ người cao tuổi."));
    }

    /// <summary>Vô hiệu hóa (xóa mềm, giữ lịch sử — SRS 3.4.3) hoặc kích hoạt lại</summary>
    [HttpPatch("elderly/{id:int}/active")]
    public async Task<IActionResult> SetElderlyActive(int id, [FromQuery] bool value)
    {
        var e = await _context.ElderlyMembers.FirstOrDefaultAsync(x => x.ElderlyId == id);
        if (e == null) return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người cao tuổi."));

        if (!value)
        {
            var today = VietnamTime.Today;
            var present = await _context.AttendanceRecords.AnyAsync(a =>
                a.ElderlyId == id && a.AttendanceDate == today && a.CheckInAt != null && a.CheckOutAt == null);
            if (present)
                return BadRequest(ApiResponse<bool>.Fail("Cụ đang có mặt tại trung tâm, hãy check-out trước khi vô hiệu hóa."));
        }

        e.IsActive = value;
        e.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, CurrentUserId(), value ? "ACTIVATE_ELDERLY" : "DEACTIVATE_ELDERLY",
            nameof(ElderlyMember), id.ToString(), new { IsActive = value });

        return Ok(ApiResponse<bool>.Ok(value, value ? "Đã kích hoạt lại hồ sơ." : "Đã vô hiệu hóa hồ sơ (lịch sử được giữ lại)."));
    }

    /// <summary>Danh sách hồ sơ đã vô hiệu hóa (để kích hoạt lại)</summary>
    [HttpGet("elderly/inactive")]
    public async Task<IActionResult> GetInactiveElderly()
    {
        var list = await _context.ElderlyMembers.AsNoTracking()
            .Where(e => !e.IsActive)
            .OrderBy(e => e.FullName)
            .Select(e => new { e.ElderlyId, e.FullName, e.DateOfBirth, e.UpdatedAt })
            .ToListAsync();
        return Ok(ApiResponse<object>.Ok(list, "Lấy danh sách hồ sơ đã vô hiệu hóa thành công."));
    }

    private async Task<ElderlyDetailDto?> LoadElderlyAsync(int id)
    {
        var e = await _context.ElderlyMembers.AsNoTracking().FirstOrDefaultAsync(x => x.ElderlyId == id);
        if (e == null) return null;

        var today = VietnamTime.Today;
        var family = await _context.ElderlyFamilyRelationships.AsNoTracking()
            .Where(r => r.ElderlyId == id)
            .Select(r => new { r.Relationship, r.FamilyMember.User.FullName, r.FamilyMember.User.PhoneNumber })
            .ToListAsync();
        var packages = await _context.ServiceRegistrations.AsNoTracking()
            .Where(r => r.ElderlyId == id && r.Status == "Confirmed" && (r.EndDate == null || r.EndDate >= today))
            .Select(r => new { r.Package.PackageName, r.StartDate, r.EndDate })
            .ToListAsync();
        var staff = await _context.StaffCareAssignments.AsNoTracking()
            .Where(a => a.ElderlyId == id && a.Plan.PlanDate == today)
            .Select(a => a.Staff.FullName)
            .Distinct()
            .ToListAsync();

        return new ElderlyDetailDto
        {
            ElderlyId = e.ElderlyId,
            FullName = e.FullName,
            DateOfBirth = e.DateOfBirth,
            Gender = e.Gender,
            Address = e.Address,
            EmergencyContactName = e.EmergencyContactName,
            EmergencyContactPhone = e.EmergencyContactPhone,
            Allergies = e.Allergies,
            MedicalHistory = e.MedicalHistory,
            MedicalNotes = e.MedicalNotes,
            MobilityStatus = e.MobilityStatus is "Support" or "Cần hỗ trợ" ? "Support" : "Normal",
            ChronicConditions = ChronicConditionCodes.Parse(e.ChronicConditions).OrderBy(c => Array.IndexOf(ChronicConditionCodes.All, c)).ToList(),
            CareNotes = e.CareNotes,
            EmergencyNotes = e.EmergencyNotes,
            IsActive = e.IsActive,
            FamilyContacts = family.Select(f => $"{f.FullName} ({f.Relationship ?? "Người thân"}) {f.PhoneNumber}".Trim()).ToList(),
            ActivePackages = packages.Select(p => $"{p.PackageName}: {p.StartDate:dd/MM/yyyy} → {(p.EndDate.HasValue ? p.EndDate.Value.ToString("dd/MM/yyyy") : "…")}").ToList(),
            AssignedStaffToday = staff
        };
    }

    // ───────── helpers ─────────

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private ApiResponse<T> ValidationFail<T>() =>
        ApiResponse<T>.Fail("Dữ liệu không hợp lệ.",
            ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList());

    private int? CurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;
}
