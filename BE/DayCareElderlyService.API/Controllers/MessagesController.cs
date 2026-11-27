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
/// SR-38 / F-09: nhắn tin theo ngữ cảnh giữa gia đình và nhân viên phụ trách cụ.
/// Mỗi (cụ, thành viên gia đình) có một cuộc trò chuyện; phía trung tâm là nhân viên được phân cụ hôm nay
/// (đổi theo kế hoạch ngày), quản lý xem và trả lời được mọi cuộc trò chuyện.
/// </summary>
[ApiController]
[Route("api/messages")]
[Authorize(Roles = "FamilyMember,Staff,Center,CenterManager,Admin")]
public class MessagesController : ControllerBase
{
    private readonly AppDbContext _context;

    public MessagesController(AppDbContext context)
    {
        _context = context;
    }

    public class ConversationDto
    {
        public int ConversationId { get; set; }
        public int ElderlyId { get; set; }
        public string ElderlyName { get; set; } = string.Empty;
        public int FamilyUserId { get; set; }
        public string FamilyName { get; set; } = string.Empty;
        public int StaffUserId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public DateTime? LastMessageAt { get; set; }
        public string? LastMessage { get; set; }
        public int UnreadCount { get; set; }
    }

    public class MessageDto
    {
        public int MessageId { get; set; }
        public int SenderUserId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public bool IsMine { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }
        public DateTime? ReadAt { get; set; }
    }

    public class SendMessageDto
    {
        [Required(ErrorMessage = "Nội dung không được để trống."), StringLength(2000, ErrorMessage = "Tối đa 2000 ký tự.")]
        public string Content { get; set; } = string.Empty;
    }

    public class StartConversationDto
    {
        [Required] public int ElderlyId { get; set; }
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> List()
    {
        var me = await CurrentUserAsync();
        if (me == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));

        var query = _context.Conversations.AsNoTracking().AsQueryable();
        if (me.IsFamily) query = query.Where(c => c.FamilyUserId == me.UserId);
        else if (!me.IsManager)
        {
            var assigned = await AssignedTodayAsync(me.UserId);
            query = query.Where(c => c.StaffUserId == me.UserId || assigned.Contains(c.ElderlyId));
        }

        var list = await query
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .Select(c => new ConversationDto
            {
                ConversationId = c.ConversationId,
                ElderlyId = c.ElderlyId,
                ElderlyName = c.Elderly.FullName,
                FamilyUserId = c.FamilyUserId,
                FamilyName = c.FamilyUser.FullName,
                StaffUserId = c.StaffUserId,
                StaffName = c.StaffUser.FullName,
                LastMessageAt = c.LastMessageAt,
                LastMessage = c.Messages.OrderByDescending(m => m.SentAt).Select(m => m.Content).FirstOrDefault(),
                UnreadCount = c.Messages.Count(m => m.SenderUserId != me.UserId && m.ReadAt == null
                    && (me.IsFamily ? m.SenderUserId != c.FamilyUserId : m.SenderUserId == c.FamilyUserId))
            })
            .ToListAsync();
        return Ok(ApiResponse<List<ConversationDto>>.Ok(list, "Lấy danh sách cuộc trò chuyện thành công."));
    }

    /// <summary>
    /// Mở (hoặc lấy lại) cuộc trò chuyện về một người cao tuổi.
    /// Gia đình: với nhân viên phụ trách cụ hôm nay. Nhân viên: với gia đình của cụ mình phụ trách hôm nay
    /// (quản lý: cụ bất kỳ) — ưu tiên người liên hệ chính.
    /// </summary>
    [HttpPost("conversations")]
    public async Task<IActionResult> Start([FromBody] StartConversationDto dto)
    {
        var me = await CurrentUserAsync();
        if (me == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        if (!me.IsFamily) return await StartAsStaffAsync(me, dto.ElderlyId);
        var linked = await _context.ElderlyFamilyRelationships.AnyAsync(r => r.ElderlyId == dto.ElderlyId && r.FamilyMember.UserId == me.UserId);
        if (!linked) return StatusCode(403, ApiResponse<ConversationDto>.Fail(AccessDenied.ElderlyMessage, AccessDenied.Errors));

        var conv = await _context.Conversations.FirstOrDefaultAsync(c => c.ElderlyId == dto.ElderlyId && c.FamilyUserId == me.UserId);
        if (conv == null)
        {
            var staffId = await ResponsibleStaffAsync(dto.ElderlyId);
            if (staffId == null) return BadRequest(ApiResponse<ConversationDto>.Fail("Trung tâm chưa có nhân viên để nhận tin nhắn."));
            conv = new Conversation
            {
                ElderlyId = dto.ElderlyId,
                FamilyUserId = me.UserId,
                StaffUserId = staffId.Value,
                IsClosed = false,
                CreatedAt = VietnamTime.Now
            };
            await _context.Conversations.AddAsync(conv);
            await _context.SaveChangesAsync();
        }
        return Ok(ApiResponse<object>.Ok(new { conv.ConversationId }, "Đã mở cuộc trò chuyện."));
    }

    [HttpGet("conversations/{id:int}/messages")]
    public async Task<IActionResult> Messages(int id)
    {
        var me = await CurrentUserAsync();
        if (me == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        var conv = await _context.Conversations.FirstOrDefaultAsync(c => c.ConversationId == id);
        if (conv == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy cuộc trò chuyện."));
        if (!await CanAccessAsync(me, conv)) return StatusCode(403, ApiResponse<object>.Fail("Bạn không có quyền xem cuộc trò chuyện này."));

        // Đánh dấu đã đọc tin của phía bên kia
        var now = VietnamTime.Now;
        var incoming = await _context.Messages
            .Where(m => m.ConversationId == id && m.ReadAt == null
                     && (me.IsFamily ? m.SenderUserId != conv.FamilyUserId : m.SenderUserId == conv.FamilyUserId))
            .ToListAsync();
        incoming.ForEach(m => m.ReadAt = now);
        if (incoming.Count > 0) await _context.SaveChangesAsync();

        var list = await _context.Messages.AsNoTracking()
            .Where(m => m.ConversationId == id)
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto
            {
                MessageId = m.MessageId,
                SenderUserId = m.SenderUserId,
                SenderName = m.SenderUser.FullName,
                IsMine = m.SenderUserId == me.UserId,
                Content = m.Content,
                SentAt = m.SentAt,
                ReadAt = m.ReadAt
            })
            .ToListAsync();
        return Ok(ApiResponse<List<MessageDto>>.Ok(list, "Lấy tin nhắn thành công."));
    }

    [HttpPost("conversations/{id:int}/messages")]
    public async Task<IActionResult> Send(int id, [FromBody] SendMessageDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<MessageDto>.Fail("Dữ liệu không hợp lệ.", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()));
        var me = await CurrentUserAsync();
        if (me == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        var conv = await _context.Conversations.Include(c => c.Elderly).FirstOrDefaultAsync(c => c.ConversationId == id);
        if (conv == null) return NotFound(ApiResponse<object>.Fail("Không tìm thấy cuộc trò chuyện."));
        if (!await CanAccessAsync(me, conv)) return StatusCode(403, ApiResponse<object>.Fail("Bạn không có quyền gửi tin trong cuộc trò chuyện này."));

        var now = VietnamTime.Now;
        if (me.IsFamily)
        {
            // Tin gia đình gửi tới nhân viên đang phụ trách cụ hôm nay
            var responsible = await ResponsibleStaffAsync(conv.ElderlyId);
            if (responsible.HasValue) conv.StaffUserId = responsible.Value;
        }
        else if (!me.IsManager)
        {
            conv.StaffUserId = me.UserId;
        }

        var msg = new Message { ConversationId = id, SenderUserId = me.UserId, Content = dto.Content.Trim(), SentAt = now };
        await _context.Messages.AddAsync(msg);
        conv.LastMessageAt = now;
        conv.UpdatedAt = now;

        var recipient = me.IsFamily ? conv.StaffUserId : conv.FamilyUserId;
        var preview = msg.Content.Length > 120 ? msg.Content[..120] + "…" : msg.Content;
        await CareLogShared.AddNotificationsAsync(_context, new[] { recipient },
            me.IsFamily ? $"Tin nhắn từ gia đình {conv.Elderly.FullName}" : $"Trung tâm trả lời về {conv.Elderly.FullName}",
            $"{me.FullName}: {preview}", "Message", nameof(Conversation), conv.ConversationId);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<MessageDto>.Ok(new MessageDto
        {
            MessageId = msg.MessageId, SenderUserId = me.UserId, SenderName = me.FullName, IsMine = true, Content = msg.Content, SentAt = msg.SentAt
        }, "Đã gửi."));
    }

    // ───────── helpers ─────────

    private async Task<IActionResult> StartAsStaffAsync(CurrentUser me, int elderlyId)
    {
        if (!me.IsManager && !(await AssignedTodayAsync(me.UserId)).Contains(elderlyId))
            return StatusCode(403, ApiResponse<object>.Fail("Bạn chỉ nhắn được cho gia đình của cụ mình phụ trách hôm nay."));

        // Gia đình đã có cuộc trò chuyện về cụ thì dùng lại (người liên hệ chính trước)
        var existing = await _context.Conversations
            .Where(c => c.ElderlyId == elderlyId && !c.IsClosed)
            .OrderByDescending(c => _context.ElderlyFamilyRelationships.Any(r => r.ElderlyId == elderlyId && r.IsPrimaryContact && r.FamilyMember.UserId == c.FamilyUserId))
            .ThenByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .FirstOrDefaultAsync();
        if (existing != null)
        {
            // Nhân viên phụ trách hôm nay nhận tin tiếp theo của gia đình
            if (!me.IsManager && existing.StaffUserId != me.UserId)
            {
                existing.StaffUserId = me.UserId;
                await _context.SaveChangesAsync();
            }
            return Ok(ApiResponse<object>.Ok(new { existing.ConversationId }, "Đã mở cuộc trò chuyện."));
        }

        var familyUserId = await _context.ElderlyFamilyRelationships
            .Where(r => r.ElderlyId == elderlyId && r.FamilyMember.User.IsActive)
            .OrderByDescending(r => r.IsPrimaryContact)
            .Select(r => (int?)r.FamilyMember.UserId)
            .FirstOrDefaultAsync();
        if (familyUserId == null)
            return BadRequest(ApiResponse<object>.Fail("Cụ chưa có tài khoản gia đình liên kết để nhắn tin."));

        var conv = new Conversation
        {
            ElderlyId = elderlyId,
            FamilyUserId = familyUserId.Value,
            StaffUserId = me.UserId,
            IsClosed = false,
            CreatedAt = VietnamTime.Now
        };
        await _context.Conversations.AddAsync(conv);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { conv.ConversationId }, "Đã mở cuộc trò chuyện."));
    }

    private record CurrentUser(int UserId, string FullName, bool IsFamily, bool IsManager);

    private async Task<CurrentUser?> CurrentUserAsync()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id)) return null;
        var u = await _context.Users.AsNoTracking().Include(x => x.Roles).FirstOrDefaultAsync(x => x.UserId == id && x.IsActive);
        if (u == null) return null;
        var roles = u.Roles.Select(r => r.RoleName).ToList();
        return new CurrentUser(u.UserId, u.FullName,
            roles.Contains("FamilyMember") && !roles.Any(r => r is "Staff" or "Center" or "CenterManager" or "Admin"),
            roles.Any(r => r is "Center" or "CenterManager" or "Admin"));
    }

    private async Task<bool> CanAccessAsync(CurrentUser me, Conversation conv)
    {
        if (me.IsFamily) return conv.FamilyUserId == me.UserId;
        if (me.IsManager || conv.StaffUserId == me.UserId) return true;
        return (await AssignedTodayAsync(me.UserId)).Contains(conv.ElderlyId);
    }

    private async Task<List<int>> AssignedTodayAsync(int staffId)
    {
        var today = VietnamTime.Today;
        var viaGroups = await _context.CareGroupMembers
            .Where(m => m.Group.Plan.PlanDate == today && m.Group.StaffId == staffId).Select(m => m.ElderlyId).ToListAsync();
        var viaAssign = await _context.StaffCareAssignments
            .Where(a => a.Plan.PlanDate == today && a.StaffId == staffId).Select(a => a.ElderlyId).ToListAsync();
        return viaGroups.Concat(viaAssign).Distinct().ToList();
    }

    /// <summary>Nhân viên phụ trách cụ hôm nay; không có thì một quản lý trung tâm</summary>
    private async Task<int?> ResponsibleStaffAsync(int elderlyId)
    {
        var today = VietnamTime.Today;
        var staffId = await _context.StaffCareAssignments
            .Where(a => a.ElderlyId == elderlyId && a.Plan.PlanDate == today)
            .Select(a => (int?)a.StaffId).FirstOrDefaultAsync();
        staffId ??= await _context.CareGroupMembers
            .Where(m => m.ElderlyId == elderlyId && m.Group.Plan.PlanDate == today && m.Group.StaffId != null)
            .Select(m => m.Group.StaffId).FirstOrDefaultAsync();
        staffId ??= await _context.Users
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Center" || r.RoleName == "CenterManager"))
            .Select(u => (int?)u.UserId).FirstOrDefaultAsync();
        return staffId;
    }
}
