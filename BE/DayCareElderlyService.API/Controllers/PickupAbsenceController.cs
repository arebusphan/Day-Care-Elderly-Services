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
/// BR-30: người được ủy quyền đón cụ (gia đình quản lý, nhân viên đối chiếu khi check-out).
/// SR-32: gia đình báo vắng; kế hoạch ngày tự đánh dấu Absent.
/// </summary>
[ApiController]
[Route("api")]
public class PickupAbsenceController : ControllerBase
{
    private readonly AppDbContext _context;

    public PickupAbsenceController(AppDbContext context)
    {
        _context = context;
    }

    public class PickupPersonDto
    {
        public int PickupPersonId { get; set; }
        public int ElderlyId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Relationship { get; set; }
        public string PhoneNumber { get; set; } = string.Empty;
        /// <summary>Family thấy đủ 4 số; nhân viên chỉ dùng để đối chiếu</summary>
        public string IdCardLast4 { get; set; } = string.Empty;
    }

    public class SavePickupPersonDto
    {
        [Required(ErrorMessage = "Nhập họ tên người đón."), StringLength(150)]
        public string FullName { get; set; } = string.Empty;
        [StringLength(50)]
        public string? Relationship { get; set; }
        [Required, RegularExpression(@"^(0|\+84)\d{9,10}$", ErrorMessage = "Số điện thoại không hợp lệ.")]
        public string PhoneNumber { get; set; } = string.Empty;
        [Required, RegularExpression(@"^\d{4}$", ErrorMessage = "Nhập đúng 4 số cuối CCCD.")]
        public string IdCardLast4 { get; set; } = string.Empty;
    }

    public class AbsenceDto
    {
        public int AbsenceId { get; set; }
        public int ElderlyId { get; set; }
        public string ElderlyName { get; set; } = string.Empty;
        public DateOnly AbsenceDate { get; set; }
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateAbsenceDto
    {
        [Required] public int ElderlyId { get; set; }
        [Required] public DateOnly AbsenceDate { get; set; }
        [StringLength(500)] public string? Reason { get; set; }
    }

    // ───────── Family: người được đón ─────────

    [HttpGet("family/elderly/{elderlyId:int}/pickup-persons")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> GetMyPickupPersons(int elderlyId)
    {
        if (!await IsLinkedAsync(elderlyId)) return Forbidden<List<PickupPersonDto>>();
        return Ok(ApiResponse<List<PickupPersonDto>>.Ok(await LoadPickupAsync(elderlyId), "Lấy danh sách người được đón thành công."));
    }

    [HttpPost("family/elderly/{elderlyId:int}/pickup-persons")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> AddPickupPerson(int elderlyId, [FromBody] SavePickupPersonDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ValidationFail<PickupPersonDto>());
        if (!await IsLinkedAsync(elderlyId)) return Forbidden<PickupPersonDto>();
        var count = await _context.AuthorizedPickupPersons.CountAsync(p => p.ElderlyId == elderlyId && p.IsActive);
        if (count >= 5) return BadRequest(ApiResponse<PickupPersonDto>.Fail("Tối đa 5 người được đón cho mỗi người cao tuổi."));

        var person = new AuthorizedPickupPerson
        {
            ElderlyId = elderlyId,
            FullName = dto.FullName.Trim(),
            Relationship = string.IsNullOrWhiteSpace(dto.Relationship) ? null : dto.Relationship.Trim(),
            PhoneNumber = dto.PhoneNumber.Trim(),
            IdCardLast4 = dto.IdCardLast4.Trim(),
            IsActive = true,
            CreatedAt = VietnamTime.Now
        };
        await _context.AuthorizedPickupPersons.AddAsync(person);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, CurrentUserId(), "ADD_PICKUP_PERSON", nameof(AuthorizedPickupPerson), person.PickupPersonId.ToString(), new { elderlyId, person.FullName });
        return Ok(ApiResponse<PickupPersonDto>.Ok(ToDto(person), "Đã thêm người được đón."));
    }

    [HttpPut("family/pickup-persons/{pickupPersonId:int}")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> UpdatePickupPerson(int pickupPersonId, [FromBody] SavePickupPersonDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ValidationFail<PickupPersonDto>());
        var person = await _context.AuthorizedPickupPersons.FirstOrDefaultAsync(p => p.PickupPersonId == pickupPersonId && p.IsActive);
        if (person == null) return NotFound(ApiResponse<PickupPersonDto>.Fail("Không tìm thấy người được đón."));
        if (!await IsLinkedAsync(person.ElderlyId)) return Forbidden<PickupPersonDto>();

        person.FullName = dto.FullName.Trim();
        person.Relationship = string.IsNullOrWhiteSpace(dto.Relationship) ? null : dto.Relationship.Trim();
        person.PhoneNumber = dto.PhoneNumber.Trim();
        person.IdCardLast4 = dto.IdCardLast4.Trim();
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<PickupPersonDto>.Ok(ToDto(person), "Đã cập nhật người được đón."));
    }

    [HttpDelete("family/pickup-persons/{pickupPersonId:int}")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> RemovePickupPerson(int pickupPersonId)
    {
        var person = await _context.AuthorizedPickupPersons.FirstOrDefaultAsync(p => p.PickupPersonId == pickupPersonId && p.IsActive);
        if (person == null) return NotFound(ApiResponse<bool>.Fail("Không tìm thấy người được đón."));
        if (!await IsLinkedAsync(person.ElderlyId)) return Forbidden<bool>();
        person.IsActive = false; // giữ lịch sử đón trong AttendanceRecords
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Đã xóa người được đón."));
    }

    // ───────── Staff / Manager: danh sách người được đón để đối chiếu khi check-out ─────────

    [HttpGet("attendance/elderly/{elderlyId:int}/pickup-persons")]
    [Authorize(Roles = "Staff,Center,CenterManager,Admin")]
    public async Task<IActionResult> GetPickupPersonsForCheckout(int elderlyId)
    {
        var list = await LoadPickupAsync(elderlyId);
        // Nhân viên đối chiếu bằng cách nhập 4 số cuối người đón đưa ra → không trả về số thật
        list.ForEach(p => p.IdCardLast4 = "••••");
        return Ok(ApiResponse<List<PickupPersonDto>>.Ok(list, "Lấy danh sách người được đón thành công."));
    }

    // ───────── Family: báo vắng ─────────

    [HttpGet("family/absences")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> GetMyAbsences()
    {
        var userId = CurrentUserId();
        var today = VietnamTime.Today;
        var list = await _context.AbsenceReports.AsNoTracking()
            .Where(a => a.AbsenceDate >= today.AddDays(-30)
                     && _context.ElderlyFamilyRelationships.Any(r => r.ElderlyId == a.ElderlyId && r.FamilyMember.UserId == userId))
            .OrderByDescending(a => a.AbsenceDate)
            .Select(a => new AbsenceDto { AbsenceId = a.AbsenceId, ElderlyId = a.ElderlyId, ElderlyName = a.Elderly.FullName, AbsenceDate = a.AbsenceDate, Reason = a.Reason, CreatedAt = a.CreatedAt })
            .ToListAsync();
        return Ok(ApiResponse<List<AbsenceDto>>.Ok(list, "Lấy danh sách báo vắng thành công."));
    }

    [HttpPost("family/absences")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> ReportAbsence([FromBody] CreateAbsenceDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ValidationFail<AbsenceDto>());
        if (!await IsLinkedAsync(dto.ElderlyId)) return Forbidden<AbsenceDto>();
        var today = VietnamTime.Today;
        if (dto.AbsenceDate < today) return BadRequest(ApiResponse<AbsenceDto>.Fail("Không thể báo vắng cho ngày đã qua."));
        if (dto.AbsenceDate > today.AddDays(60)) return BadRequest(ApiResponse<AbsenceDto>.Fail("Chỉ báo vắng trước tối đa 60 ngày."));
        if (dto.AbsenceDate.DayOfWeek == DayOfWeek.Sunday) return BadRequest(ApiResponse<AbsenceDto>.Fail("Chủ nhật trung tâm nghỉ, không cần báo vắng."));
        if (await _context.AbsenceReports.AnyAsync(a => a.ElderlyId == dto.ElderlyId && a.AbsenceDate == dto.AbsenceDate))
            return BadRequest(ApiResponse<AbsenceDto>.Fail("Đã báo vắng cho ngày này."));
        if (dto.AbsenceDate == today && await _context.AttendanceRecords.AnyAsync(a => a.ElderlyId == dto.ElderlyId && a.AttendanceDate == today && a.CheckInAt != null))
            return BadRequest(ApiResponse<AbsenceDto>.Fail("Người thân đã có mặt tại trung tâm hôm nay."));

        var elderly = await _context.ElderlyMembers.FirstAsync(e => e.ElderlyId == dto.ElderlyId);
        var absence = new AbsenceReport
        {
            ElderlyId = dto.ElderlyId,
            AbsenceDate = dto.AbsenceDate,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim(),
            ReportedBy = CurrentUserId()!.Value,
            CreatedAt = VietnamTime.Now
        };
        await _context.AbsenceReports.AddAsync(absence);

        // Kế hoạch đã lập cho ngày đó → cập nhật dự báo thành Absent
        var forecast = await _context.DailyAttendanceForecasts
            .FirstOrDefaultAsync(f => f.Plan.PlanDate == dto.AbsenceDate && f.ElderlyId == dto.ElderlyId);
        if (forecast != null)
        {
            forecast.AttendanceStatus = "Absent";
            forecast.Reason = $"Gia đình báo vắng{(absence.Reason == null ? "" : ": " + absence.Reason)}";
            forecast.UpdatedAt = DateTime.UtcNow;
        }

        await CareLogShared.NotifyManagersAsync(_context,
            $"Báo vắng: {elderly.FullName}",
            $"Gia đình báo {elderly.FullName} vắng ngày {dto.AbsenceDate:dd/MM/yyyy}{(absence.Reason == null ? "" : ". Lý do: " + absence.Reason)}.",
            "Absence", nameof(ElderlyMember), elderly.ElderlyId);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<AbsenceDto>.Ok(new AbsenceDto
        {
            AbsenceId = absence.AbsenceId, ElderlyId = absence.ElderlyId, ElderlyName = elderly.FullName,
            AbsenceDate = absence.AbsenceDate, Reason = absence.Reason, CreatedAt = absence.CreatedAt
        }, "Đã báo vắng. Trung tâm đã được thông báo."));
    }

    [HttpDelete("family/absences/{absenceId:int}")]
    [Authorize(Roles = "FamilyMember")]
    public async Task<IActionResult> CancelAbsence(int absenceId)
    {
        var absence = await _context.AbsenceReports.FirstOrDefaultAsync(a => a.AbsenceId == absenceId);
        if (absence == null) return NotFound(ApiResponse<bool>.Fail("Không tìm thấy báo vắng."));
        if (!await IsLinkedAsync(absence.ElderlyId)) return Forbidden<bool>();
        if (absence.AbsenceDate < VietnamTime.Today) return BadRequest(ApiResponse<bool>.Fail("Không hủy được báo vắng của ngày đã qua."));

        var forecast = await _context.DailyAttendanceForecasts
            .FirstOrDefaultAsync(f => f.Plan.PlanDate == absence.AbsenceDate && f.ElderlyId == absence.ElderlyId && f.AttendanceStatus == "Absent");
        if (forecast != null)
        {
            forecast.AttendanceStatus = "NotConfirmed"; // Manager xác nhận lại
            forecast.Reason = "Gia đình hủy báo vắng";
            forecast.UpdatedAt = DateTime.UtcNow;
        }
        _context.AbsenceReports.Remove(absence);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Đã hủy báo vắng."));
    }

    // ───────── Manager: báo vắng theo ngày ─────────

    [HttpGet("center/absences")]
    [Authorize(Roles = "Center,CenterManager,Admin,Staff")]
    public async Task<IActionResult> GetAbsencesByDate([FromQuery] DateOnly? date)
    {
        var day = date ?? VietnamTime.Today;
        var list = await _context.AbsenceReports.AsNoTracking()
            .Where(a => a.AbsenceDate == day)
            .Select(a => new AbsenceDto { AbsenceId = a.AbsenceId, ElderlyId = a.ElderlyId, ElderlyName = a.Elderly.FullName, AbsenceDate = a.AbsenceDate, Reason = a.Reason, CreatedAt = a.CreatedAt })
            .ToListAsync();
        return Ok(ApiResponse<List<AbsenceDto>>.Ok(list, "Lấy danh sách báo vắng thành công."));
    }

    // ───────── helpers ─────────

    private Task<List<PickupPersonDto>> LoadPickupAsync(int elderlyId) =>
        _context.AuthorizedPickupPersons.AsNoTracking()
            .Where(p => p.ElderlyId == elderlyId && p.IsActive)
            .OrderBy(p => p.FullName)
            .Select(p => new PickupPersonDto
            {
                PickupPersonId = p.PickupPersonId, ElderlyId = p.ElderlyId, FullName = p.FullName,
                Relationship = p.Relationship, PhoneNumber = p.PhoneNumber, IdCardLast4 = p.IdCardLast4
            })
            .ToListAsync();

    private static PickupPersonDto ToDto(AuthorizedPickupPerson p) => new()
    {
        PickupPersonId = p.PickupPersonId, ElderlyId = p.ElderlyId, FullName = p.FullName,
        Relationship = p.Relationship, PhoneNumber = p.PhoneNumber, IdCardLast4 = p.IdCardLast4
    };

    private Task<bool> IsLinkedAsync(int elderlyId)
    {
        var userId = CurrentUserId();
        return _context.ElderlyFamilyRelationships.AnyAsync(r => r.ElderlyId == elderlyId && r.FamilyMember.UserId == userId);
    }

    private ObjectResult Forbidden<T>() =>
        StatusCode(StatusCodes.Status403Forbidden, ApiResponse<T>.Fail(AccessDenied.ElderlyMessage, AccessDenied.Errors));

    private ApiResponse<T> ValidationFail<T>() =>
        ApiResponse<T>.Fail("Dữ liệu không hợp lệ.", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList());

    private int? CurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;
}
