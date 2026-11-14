using System.Text.Json;
using Anthropic;
using Anthropic.Models.Beta;
using Anthropic.Models.Beta.Messages;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.Models.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// F-06: gợi ý phân nhân viên cho các nhóm chăm sóc của một kế hoạch ngày.
/// - Dữ liệu gửi AI được ẩn danh (BR-51): nhân viên chỉ là mã S1, S2…, không tên / email / SĐT.
/// - Kết quả luôn là bản nháp (BR-50): không ghi DB, Manager xem rồi bấm áp dụng.
/// - Không cấu hình API key hoặc gọi AI lỗi → thuật toán theo luật (cân bằng khối lượng công việc).
/// </summary>
public class AiShiftSuggestionService
{
    private const string Model = "claude-opus-5-5";
    private const int WorkloadWindowDays = 14;

    private readonly AppDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AiShiftSuggestionService> _logger;

    public AiShiftSuggestionService(AppDbContext context, IConfiguration config, ILogger<AiShiftSuggestionService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    public class SuggestionItem
    {
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string GroupType { get; set; } = string.Empty;
        public int MemberCount { get; set; }
        public int? CurrentStaffId { get; set; }
        public int? StaffId { get; set; }
        public string? StaffName { get; set; }
        public string? Reason { get; set; }
    }

    public class SuggestionResult
    {
        /// <summary>"claude" hoặc "rules"</summary>
        public string Source { get; set; } = "rules";
        public string? Model { get; set; }
        public DateOnly PlanDate { get; set; }
        public List<SuggestionItem> Suggestions { get; set; } = new();
        public List<string> Notes { get; set; } = new();
    }

    private record StaffCandidate(string Code, int UserId, string FullName, int WorkDays, int RecentSupportDays);
    private record GroupInfo(int GroupId, string GroupName, string GroupType, int MemberCount, int? StaffId);

    public async Task<ApiResponse<SuggestionResult>> SuggestAsync(int planId, CancellationToken ct = default)
    {
        var plan = await _context.DailySchedulePlans.AsNoTracking().FirstOrDefaultAsync(p => p.PlanId == planId, ct);
        if (plan == null) return ApiResponse<SuggestionResult>.Fail("Không tìm thấy kế hoạch.");

        var groups = await _context.DailyCareGroups.AsNoTracking()
            .Where(g => g.PlanId == planId)
            .Select(g => new GroupInfo(g.GroupId, g.GroupName, g.GroupType, g.Members.Count, g.StaffId))
            .ToListAsync(ct);
        groups = groups.Where(g => g.MemberCount > 0).OrderByDescending(g => g.GroupType == "Support").ThenByDescending(g => g.MemberCount).ToList();
        if (groups.Count == 0)
            return ApiResponse<SuggestionResult>.Fail("Kế hoạch chưa có nhóm nào có người cao tuổi. Hãy hoàn tất bước 1–2 trước.");

        var staff = await LoadAvailableStaffAsync(plan.PlanDate, ct);
        if (staff.Count == 0)
            return ApiResponse<SuggestionResult>.Fail("Không có nhân viên đi làm ngày này (bước 3).");

        var result = new SuggestionResult { PlanDate = plan.PlanDate };
        if (staff.Count < groups.Count)
            result.Notes.Add($"Thiếu nhân sự: {groups.Count} nhóm nhưng chỉ {staff.Count} nhân viên đi làm.");

        Dictionary<int, (string Code, string Reason)>? picks = null;
        var apiKey = _config["Anthropic:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey)) apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                picks = await AskClaudeAsync(apiKey, plan.PlanDate, groups, staff, ct);
                result.Source = "claude";
                result.Model = Model;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI shift suggestion failed, falling back to rules");
                result.Notes.Add("Không gọi được AI, đã dùng thuật toán theo luật.");
            }
        }
        else
        {
            result.Notes.Add("Chưa cấu hình Anthropic:ApiKey — dùng thuật toán theo luật (cân bằng khối lượng công việc).");
        }

        picks ??= RulePicks(groups, staff);

        var used = new HashSet<string>();
        foreach (var g in groups)
        {
            var item = new SuggestionItem
            {
                GroupId = g.GroupId, GroupName = g.GroupName, GroupType = g.GroupType,
                MemberCount = g.MemberCount, CurrentStaffId = g.StaffId
            };
            if (picks.TryGetValue(g.GroupId, out var pick) && used.Add(pick.Code))
            {
                var s = staff.FirstOrDefault(x => x.Code == pick.Code);
                if (s != null)
                {
                    item.StaffId = s.UserId;
                    item.StaffName = s.FullName;
                    item.Reason = pick.Reason;
                }
            }
            result.Suggestions.Add(item);
        }

        // AI có thể bỏ sót nhóm → bù bằng luật với nhân viên còn trống
        var free = staff.Where(s => !used.Contains(s.Code)).OrderBy(s => s.WorkDays).ToList();
        foreach (var item in result.Suggestions.Where(i => i.StaffId == null))
        {
            var s = free.FirstOrDefault();
            if (s == null) break;
            free.Remove(s);
            item.StaffId = s.UserId;
            item.StaffName = s.FullName;
            item.Reason = "Bổ sung theo luật: nhân viên còn trống, ít ngày làm nhất.";
        }

        return ApiResponse<SuggestionResult>.Ok(result, result.Source == "claude"
            ? "Đã có gợi ý phân ca từ AI. Vui lòng xem lại trước khi áp dụng."
            : "Đã có gợi ý phân ca theo luật. Vui lòng xem lại trước khi áp dụng.");
    }

    private async Task<List<StaffCandidate>> LoadAvailableStaffAsync(DateOnly date, CancellationToken ct)
    {
        var users = await _context.Users.AsNoTracking()
            .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "Staff"))
            .Select(u => new { u.UserId, u.FullName })
            .ToListAsync(ct);
        var schedules = await _context.StaffSchedules.AsNoTracking()
            .Where(s => s.WorkDate == date)
            .ToDictionaryAsync(s => s.StaffId, s => s.Availability ?? (s.IsWorking ? "Working" : "Off"), ct);
        var since = date.AddDays(-WorkloadWindowDays);
        var history = await _context.DailyCareGroups.AsNoTracking()
            .Where(g => g.StaffId != null && g.Plan.PlanDate >= since && g.Plan.PlanDate < date)
            .Select(g => new { StaffId = g.StaffId!.Value, g.Plan.PlanDate, g.GroupType })
            .ToListAsync(ct);

        return users
            .Where(u => !schedules.TryGetValue(u.UserId, out var a) || a == "Working")
            .OrderBy(u => u.UserId)
            .Select((u, i) => new StaffCandidate(
                $"S{i + 1}", u.UserId, u.FullName,
                history.Where(h => h.StaffId == u.UserId).Select(h => h.PlanDate).Distinct().Count(),
                history.Where(h => h.StaffId == u.UserId && h.GroupType == "Support").Select(h => h.PlanDate).Distinct().Count()))
            .ToList();
    }

    /// <summary>Luật: nhóm Support và nhóm đông trước; giao cho người ít ngày làm nhất trong 14 ngày (tránh dồn việc).</summary>
    private static Dictionary<int, (string Code, string Reason)> RulePicks(List<GroupInfo> groups, List<StaffCandidate> staff)
    {
        var free = staff.OrderBy(s => s.WorkDays).ThenBy(s => s.RecentSupportDays).ToList();
        var picks = new Dictionary<int, (string, string)>();
        foreach (var g in groups)
        {
            var s = g.GroupType == "Support"
                ? free.OrderBy(x => x.RecentSupportDays).ThenBy(x => x.WorkDays).FirstOrDefault()
                : free.FirstOrDefault();
            if (s == null) break;
            free.Remove(s);
            picks[g.GroupId] = (s.Code, g.GroupType == "Support"
                ? $"Ít ca nhóm cần hỗ trợ gần đây ({s.RecentSupportDays} ngày), {s.WorkDays} ngày làm trong 14 ngày."
                : $"Khối lượng thấp: {s.WorkDays} ngày làm trong 14 ngày.");
        }
        return picks;
    }

    private async Task<Dictionary<int, (string Code, string Reason)>> AskClaudeAsync(
        string apiKey, DateOnly date, List<GroupInfo> groups, List<StaffCandidate> staff, CancellationToken ct)
    {
        // BR-51: chỉ gửi mã nhân viên và số liệu, không có thông tin cá nhân của nhân viên hay người cao tuổi
        var payload = JsonSerializer.Serialize(new
        {
            date = date.ToString("yyyy-MM-dd"),
            rules = new
            {
                oneGroupPerStaff = true,
                normalGroupMaxElderlyPerStaff = 10,
                supportGroupMaxElderlyPerStaff = 4,
                goal = "Balance workload across staff; avoid giving Support groups to the same staff many days in a row."
            },
            groups = groups.Select(g => new { groupId = g.GroupId, type = g.GroupType, elderlyCount = g.MemberCount }),
            staff = staff.Select(s => new { code = s.Code, workDaysLast14 = s.WorkDays, supportDaysLast14 = s.RecentSupportDays })
        });

        var client = new AnthropicClient { ApiKey = apiKey };
        var response = await client.Beta.Messages.Create(new MessageCreateParams
        {
            Model = Model,
            MaxTokens = 4000,
            Betas = [AnthropicBeta.ServerSideFallback2026_07_01],
            Fallbacks = new Default(),
            System = "You help a Vietnamese elderly day-care center draft tomorrow's staff assignment. "
                   + "Assign at most one staff code to each care group, each staff to at most one group. "
                   + "Prefer staff with fewer recent work days, and spread Support groups across staff. "
                   + "Write each reason in Vietnamese, one short sentence. The manager reviews the draft before it is used.",
            OutputConfig = new BetaOutputConfig
            {
                Format = new BetaJsonOutputFormat
                {
                    Schema = new Dictionary<string, JsonElement>
                    {
                        ["type"] = JsonSerializer.SerializeToElement("object"),
                        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
                        ["required"] = JsonSerializer.SerializeToElement(new[] { "assignments" }),
                        ["properties"] = JsonSerializer.SerializeToElement(new
                        {
                            assignments = new
                            {
                                type = "array",
                                items = new
                                {
                                    type = "object",
                                    additionalProperties = false,
                                    required = new[] { "groupId", "staffCode", "reason" },
                                    properties = new
                                    {
                                        groupId = new { type = "integer" },
                                        staffCode = new { type = "string" },
                                        reason = new { type = "string" }
                                    }
                                }
                            }
                        }),
                    },
                },
            },
            Messages = [new BetaUserMessageParam { Content = payload }],
        }, cancellationToken: ct);

        if (response.StopReason == "refusal")
            throw new InvalidOperationException("AI từ chối yêu cầu.");

        var text = string.Concat(response.Content
            .Select(b => b.TryPickText(out var t) ? t.Text : string.Empty));
        using var doc = JsonDocument.Parse(text);
        var picks = new Dictionary<int, (string, string)>();
        var validCodes = staff.Select(s => s.Code).ToHashSet();
        var validGroups = groups.Select(g => g.GroupId).ToHashSet();
        foreach (var a in doc.RootElement.GetProperty("assignments").EnumerateArray())
        {
            var gid = a.GetProperty("groupId").GetInt32();
            var code = a.GetProperty("staffCode").GetString() ?? string.Empty;
            if (validGroups.Contains(gid) && validCodes.Contains(code) && !picks.ContainsKey(gid))
                picks[gid] = (code, a.GetProperty("reason").GetString() ?? string.Empty);
        }
        return picks;
    }
}
