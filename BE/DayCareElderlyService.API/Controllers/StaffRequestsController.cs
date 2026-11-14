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
/// SRS 3.10.2: nhân viên gửi đơn nghỉ / đổi ca, Manager duyệt. Đơn được duyệt cập nhật StaffSchedules
/// (bước 3 của wizard tự hiểu), và nếu kế hoạch ngày đó đã phân nhóm thì chuyển nhóm sang người làm thay.
/// Kèm "Lịch của tôi" cho nhân viên.
/// </summary>
[ApiController]
[Route("api")]
public class StaffRequestsController : ControllerBase
{
    private const string Leave = "Leave", ShiftChange = "ShiftChange";
    private const string Pending = "Pending", Approved = "Approved", Rejected = "Rejected";
    private readonly AppDbContext _context;

    public StaffRequestsController(AppDbContext context)
    {
        _context = context;
    }

    public class StaffRequestDto
    {
        public int RequestId { get; set; }
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string RequestType { get; set; } = string.Empty;
        public DateOnly RequestDate { get; set; }
        public int? SwapWithStaffId { get; set; }
        public string? SwapWithStaffName { get; set; }
        public string? Reason { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ReviewerName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateStaffRequestDto
    {
        [Required] public string RequestType { get; set; } = Leave;
        [Required] public DateOnly RequestDate { get; set; }
        public int? SwapWithStaffId { get; set; }
        [StringLength(500)] public string? Reason { get; set; }
    }

    public class ReviewDto
    {
        public bool Approve { get; set; }
        [StringLength(500)] public string? Note { get; set; }
    }

    // ───────── Staff ─────────

    [HttpGet("staff/requests")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> MyRequests()
    {
        var me = CurrentUserId();
        var list = await Query().Where(r => r.StaffId == me).OrderByDescending(r => r.CreatedAt).Take(50).ToListAsync();
        return Ok(ApiResponse<List<StaffRequestDto>>.Ok(list, "Lấy danh sách đơn thành công."));
    }

    [HttpPost("staff/requests")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequestDto dto)
    {
        var me = CurrentUserId()!.Value;
        var type = dto.RequestType?.Trim();
        if (type is not (Leave or ShiftChange)) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Loại đơn chỉ nhận Leave hoặc ShiftChange."));
        if (dto.RequestDate < VietnamTime.Today) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Không thể gửi đơn cho ngày đã qua."));
        if (dto.RequestDate.DayOfWeek == DayOfWeek.Sunday) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Chủ nhật trung tâm nghỉ."));
        if (type == ShiftChange)
        {
            if (dto.SwapWithStaffId is null || dto.SwapWithStaffId == me)
                return BadRequest(ApiResponse<StaffRequestDto>.Fail("Chọn đồng nghiệp làm thay."));
            var swapOk = await _context.Users.AnyAsync(u => u.UserId == dto.SwapWithStaffId && u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"));
            if (!swapOk) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Đồng nghiệp làm thay không hợp lệ."));
        }
        if (await _context.StaffRequests.AnyAsync(r => r.StaffId == me && r.RequestDate == dto.RequestDate && r.Status == Pending))
            return BadRequest(ApiResponse<StaffRequestDto>.Fail("Bạn đã có đơn đang chờ duyệt cho ngày này."));

        var req = new StaffRequest
        {
            StaffId = me,
            RequestType = type,
            RequestDate = dto.RequestDate,
            SwapWithStaffId = type == ShiftChange ? dto.SwapWithStaffId : null,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim(),
            Status = Pending,
            CreatedAt = VietnamTime.Now
        };
        await _context.StaffRequests.AddAsync(req);
        var staffName = await _context.Users.Where(u => u.UserId == me).Select(u => u.FullName).FirstAsync();
        await CareLogShared.NotifyManagersAsync(_context,
            $"Đơn {(type == Leave ? "xin nghỉ" : "đổi ca")} mới",
            $"{staffName} gửi đơn {(type == Leave ? "xin nghỉ" : "đổi ca")} ngày {dto.RequestDate:dd/MM/yyyy}{(req.Reason == null ? "" : ": " + req.Reason)}.",
            "StaffRequest", nameof(StaffRequest), null);
        await _context.SaveChangesAsync();

        var created = await Query().FirstAsync(r => r.RequestId == req.RequestId);
        return Ok(ApiResponse<StaffRequestDto>.Ok(created, "Đã gửi đơn, chờ quản lý duyệt."));
    }

    [HttpDelete("staff/requests/{id:int}")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> Cancel(int id)
    {
        var me = CurrentUserId();
        var req = await _context.StaffRequests.FirstOrDefaultAsync(r => r.RequestId == id && r.StaffId == me);
        if (req == null) return NotFound(ApiResponse<bool>.Fail("Không tìm thấy đơn."));
        if (req.Status != Pending) return BadRequest(ApiResponse<bool>.Fail("Chỉ hủy được đơn đang chờ duyệt."));
        _context.StaffRequests.Remove(req);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Đã hủy đơn."));
    }

    /// <summary>Đồng nghiệp đang hoạt động (để chọn người làm thay)</summary>
    [HttpGet("staff/colleagues")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> Colleagues()
    {
        var me = CurrentUserId();
        var list = await _context.Users.AsNoTracking()
            .Where(u => u.IsActive && u.UserId != me && u.Roles.Any(r => r.RoleName == "Staff"))
            .OrderBy(u => u.FullName)
            .Select(u => new { u.UserId, u.FullName })
            .ToListAsync();
        return Ok(ApiResponse<object>.Ok(list, "Lấy danh sách đồng nghiệp thành công."));
    }

    /// <summary>"Lịch của tôi": đi làm / nghỉ và nhóm được phân trong các ngày tới (SRS 3.10.2)</summary>
    [HttpGet("staff/my-schedule")]
    [Authorize(Roles = "Staff")]
    public async Task<IActionResult> MySchedule([FromQuery] int days = 14)
    {
        var me = CurrentUserId()!.Value;
        days = Math.Clamp(days, 1, 31);
        var from = VietnamTime.Today;
        var to = from.AddDays(days - 1);

        var schedules = await _context.StaffSchedules.AsNoTracking()
            .Where(s => s.StaffId == me && s.WorkDate >= from && s.WorkDate <= to)
            .ToListAsync();
        var groups = await _context.DailyCareGroups.AsNoTracking()
            .Where(g => g.StaffId == me && g.Plan.PlanDate >= from && g.Plan.PlanDate <= to)
            .Select(g => new { g.Plan.PlanDate, g.Plan.Status, g.GroupName, g.GroupType, Members = g.Members.Count })
            .ToListAsync();
        var requests = await _context.StaffRequests.AsNoTracking()
            .Where(r => r.StaffId == me && r.RequestDate >= from && r.RequestDate <= to)
            .Select(r => new { r.RequestDate, r.RequestType, r.Status })
            .ToListAsync();

        var result = Enumerable.Range(0, days).Select(i => from.AddDays(i)).Select(d =>
        {
            var s = schedules.FirstOrDefault(x => x.WorkDate == d);
            var g = groups.FirstOrDefault(x => x.PlanDate == d);
            var r = requests.Where(x => x.RequestDate == d).Select(x => $"{x.RequestType}:{x.Status}").ToList();
            return new
            {
                Date = d,
                IsSunday = d.DayOfWeek == DayOfWeek.Sunday,
                Availability = d.DayOfWeek == DayOfWeek.Sunday ? "Closed" : s?.Availability ?? (s != null && !s.IsWorking ? "Off" : "Working"),
                Note = s?.Note,
                Group = g == null ? null : new { g.GroupName, g.GroupType, g.Members, PlanStatus = g.Status },
                Requests = r
            };
        });
        return Ok(ApiResponse<object>.Ok(result, "Lấy lịch làm việc thành công."));
    }

    // ───────── Manager ─────────

    [HttpGet("center/staff-requests")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    public async Task<IActionResult> All([FromQuery] string? status)
    {
        var q = Query();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);
        var list = await q.OrderBy(r => r.Status == Pending ? 0 : 1).ThenByDescending(r => r.CreatedAt).Take(100).ToListAsync();
        return Ok(ApiResponse<List<StaffRequestDto>>.Ok(list, "Lấy danh sách đơn thành công."));
    }

    [HttpPost("center/staff-requests/{id:int}/review")]
    [Authorize(Roles = "Center,CenterManager,Admin")]
    public async Task<IActionResult> Review(int id, [FromBody] ReviewDto dto)
    {
        var me = CurrentUserId()!.Value;
        var req = await _context.StaffRequests.FirstOrDefaultAsync(r => r.RequestId == id);
        if (req == null) return NotFound(ApiResponse<StaffRequestDto>.Fail("Không tìm thấy đơn."));
        if (req.Status != Pending) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Đơn đã được xử lý."));

        var warnings = new List<string>();
        if (dto.Approve)
        {
            if (req.RequestDate < VietnamTime.Today) return BadRequest(ApiResponse<StaffRequestDto>.Fail("Đơn cho ngày đã qua, không duyệt được."));
            await SetAvailabilityAsync(req.StaffId, req.RequestDate, "Leave", $"Nghỉ theo đơn #{req.RequestId}");
            if (req.RequestType == ShiftChange && req.SwapWithStaffId.HasValue)
            {
                await SetAvailabilityAsync(req.SwapWithStaffId.Value, req.RequestDate, "Working", $"Làm thay theo đơn #{req.RequestId}");
            }

            // Kế hoạch ngày đó đã phân nhóm → chuyển nhóm cho người làm thay, hoặc nhắc quản lý phân lại
            var groups = await _context.DailyCareGroups
                .Where(g => g.Plan.PlanDate == req.RequestDate && g.StaffId == req.StaffId)
                .ToListAsync();
            foreach (var g in groups)
            {
                if (req.RequestType == ShiftChange && req.SwapWithStaffId.HasValue
                    && !await _context.DailyCareGroups.AnyAsync(x => x.PlanId == g.PlanId && x.StaffId == req.SwapWithStaffId))
                {
                    g.StaffId = req.SwapWithStaffId.Value;
                    var assigns = await _context.StaffCareAssignments.Where(a => a.PlanId == g.PlanId && a.StaffId == req.StaffId).ToListAsync();
                    assigns.ForEach(a => a.StaffId = req.SwapWithStaffId.Value);
                }
                else
                {
                    warnings.Add($"Nhóm \"{g.GroupName}\" ngày {req.RequestDate:dd/MM} cần phân lại nhân viên.");
                }
            }
        }

        req.Status = dto.Approve ? Approved : Rejected;
        req.ReviewedBy = me;
        req.ReviewedAt = VietnamTime.Now;
        req.ReviewNote = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim();

        var label = req.RequestType == Leave ? "xin nghỉ" : "đổi ca";
        var notifyIds = new List<int> { req.StaffId };
        if (dto.Approve && req.SwapWithStaffId.HasValue) notifyIds.Add(req.SwapWithStaffId.Value);
        await CareLogShared.AddNotificationsAsync(_context, notifyIds,
            $"Đơn {label} ngày {req.RequestDate:dd/MM} {(dto.Approve ? "đã được duyệt" : "bị từ chối")}",
            req.ReviewNote ?? (dto.Approve ? "Lịch làm việc đã được cập nhật." : "Liên hệ quản lý để biết thêm."),
            "StaffRequest", nameof(StaffRequest), req.RequestId);

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, me, dto.Approve ? "APPROVE_STAFF_REQUEST" : "REJECT_STAFF_REQUEST",
            nameof(StaffRequest), req.RequestId.ToString(), new { req.StaffId, req.RequestType, req.RequestDate });

        var result = await Query().FirstAsync(r => r.RequestId == id);
        var message = dto.Approve ? "Đã duyệt đơn." : "Đã từ chối đơn.";
        if (warnings.Count > 0) message += " " + string.Join(" ", warnings);
        return Ok(ApiResponse<StaffRequestDto>.Ok(result, message));
    }

    // ───────── helpers ─────────

    private IQueryable<StaffRequestDto> Query() =>
        _context.StaffRequests.AsNoTracking().Select(r => new StaffRequestDto
        {
            RequestId = r.RequestId,
            StaffId = r.StaffId,
            StaffName = r.Staff.FullName,
            RequestType = r.RequestType,
            RequestDate = r.RequestDate,
            SwapWithStaffId = r.SwapWithStaffId,
            SwapWithStaffName = r.SwapWithStaff != null ? r.SwapWithStaff.FullName : null,
            Reason = r.Reason,
            Status = r.Status,
            ReviewerName = r.Reviewer != null ? r.Reviewer.FullName : null,
            ReviewedAt = r.ReviewedAt,
            ReviewNote = r.ReviewNote,
            CreatedAt = r.CreatedAt
        });

    private async Task SetAvailabilityAsync(int staffId, DateOnly date, string availability, string note)
    {
        var s = await _context.StaffSchedules.FirstOrDefaultAsync(x => x.StaffId == staffId && x.WorkDate == date);
        if (s == null)
        {
            s = new StaffSchedule { StaffId = staffId, WorkDate = date, CreatedAt = DateTime.UtcNow };
            await _context.StaffSchedules.AddAsync(s);
        }
        s.Availability = availability;
        s.IsWorking = availability == "Working";
        s.Note = note;
    }

    private int? CurrentUserId() =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) ? id : null;
}
