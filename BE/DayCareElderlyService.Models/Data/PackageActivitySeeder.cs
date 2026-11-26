using System.Globalization;
using System.Text;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

/// <summary>
/// Lịch hoạt động mẫu cho 5 gói (docs/thiet-ke-lich-hoat-dong-theo-goi.md, mục 4).
/// Chỉ chèn cho gói chưa có hoạt động nào, nên quản lý sửa lịch xong sẽ không bị ghi đè.
/// Ký hiệu (*) trong Source = thực hành chăm sóc thường quy, chưa có nguồn nghiên cứu.
/// </summary>
public static class PackageActivitySeeder
{
    private const string Nurse = "Nurse";
    private const string Caregiver = "Caregiver";
    private const string Any = "Any";

    // DayOfWeek theo .NET: 1 = Thứ 2 … 6 = Thứ 7; null = mọi ngày (trung tâm nghỉ Chủ nhật)
    private static readonly byte[] EveryDay = Array.Empty<byte>();
    private static readonly byte[] MonWedFri = { 1, 3, 5 };
    private static readonly byte[] TueThuSat = { 2, 4, 6 };

    private sealed record Row(byte[] Days, string Start, string End, string Name, string CareType, int? Minutes,
        string Role, string Purpose, string? Source = null, string? Condition = null, bool Required = true);

    /// <summary>Khung chung: đón, đo chỉ số, dưỡng sinh, ăn, nghỉ, trả cụ.</summary>
    private static IEnumerable<Row> CommonFrame(bool withWarmUp = true)
    {
        yield return new(EveryDay, "07:00", "07:45", "Đón cụ, ăn sáng", "MEAL", null, Caregiver, "Bắt đầu ngày đúng giờ, đủ dinh dưỡng");
        yield return new(EveryDay, "07:45", "08:15", "Đo chỉ số sáng, nhắc thuốc", "VITALS", null, Nurse, "Phát hiện bất thường trước khi vận động", "MSD Manuals – adult day services");
        if (withWarmUp)
            yield return new(EveryDay, "08:15", "08:45", "Dưỡng sinh, tập thở, khởi động khớp", "ACTIVITY", 30, Caregiver, "Giảm cứng khớp buổi sáng");
        yield return new(EveryDay, "11:00", "12:00", "Ăn trưa", "MEAL", null, Caregiver, "Ăn theo chế độ riêng của cụ");
        yield return new(EveryDay, "12:00", "13:30", "Nghỉ trưa", "NAP", null, Caregiver, "Phục hồi sức");
        yield return new(EveryDay, "15:00", "15:30", "Ăn xế", "MEAL", null, Caregiver, "Bổ sung năng lượng buổi chiều");
        yield return new(EveryDay, "15:30", "16:30", "Thư giãn, chốt care log, trả cụ", "NOTE", null, Any, "Bàn giao tình trạng trong ngày cho gia đình");
    }

    private static IEnumerable<Row> Basic() => CommonFrame().Concat(new Row[]
    {
        new(MonWedFri, "08:45", "09:30", "Tập sức mạnh + thăng bằng (đứng lên ngồi xuống, kiễng gót, đi nối gót)", "ACTIVITY", 45, Caregiver, "Phòng té ngã", "WHO 2020: thăng bằng + sức mạnh ≥3 ngày/tuần"),
        new(TueThuSat, "08:45", "09:15", "Đi bộ nhanh vừa sức", "ACTIVITY", 30, Caregiver, "Tốt cho tim mạch", "WHO 2020: ≥150 phút/tuần"),
        new(EveryDay, "09:30", "10:30", "Đọc báo, cờ tướng, cắm hoa", "ACTIVITY", 60, Caregiver, "Giữ trí não, tăng giao tiếp", "MSD Manuals (bằng chứng còn ít)", Required: false),
        new(EveryDay, "10:30", "11:00", "Đi bộ sân vườn, uống nước", "ACTIVITY", 30, Caregiver, "Vận động thêm, đủ nước", "(*)"),
        new(EveryDay, "14:00", "15:00", "Âm nhạc, trò chơi nhóm", "ACTIVITY", 60, Caregiver, "Đỡ buồn chán, tinh thần tốt hơn", "MSD Manuals", Required: false),

        // Bệnh nền trong gói Cơ bản (chỉ hiện cho cụ có ChronicConditions tương ứng)
        new(EveryDay, "07:00", "07:15", "Đo đường huyết lúc đói (trước ăn sáng)", "VITALS", null, Nurse, "Theo dõi đường huyết để chỉnh thuốc", "Joslin – older adult with diabetes", "DIABETES"),
        new(MonWedFri, "08:40", "08:45", "Đo đường huyết trước tập (<5 mmol/L ăn nhẹ trước; >16,7 mmol/L không tập)", "VITALS", null, Nurse, "Tránh hạ / tăng đường huyết khi tập", "IHS – Diabetes physical activity", "DIABETES"),
        new(TueThuSat, "08:40", "08:45", "Đo đường huyết trước tập (<5 mmol/L ăn nhẹ trước; >16,7 mmol/L không tập)", "VITALS", null, Nurse, "Tránh hạ / tăng đường huyết khi tập", "IHS – Diabetes physical activity", "DIABETES"),
        new(EveryDay, "09:30", "09:40", "Đo đường huyết sau tập", "VITALS", null, Nurse, "Phát hiện hạ đường huyết sau tập", "IHS – Diabetes physical activity", "DIABETES"),
        new(TueThuSat, "09:40", "10:10", "Kiểm tra bàn chân (vết xước, đỏ, tê)", "NOTE", null, Caregiver, "Phòng loét bàn chân", "(*)", "DIABETES"),
        new(EveryDay, "13:30", "14:00", "Đo huyết áp chiều", "VITALS", null, Nurse, "So sánh với buổi sáng", "(*)", "HYPERTENSION"),
    });

    private static IEnumerable<Row> Rehab() => CommonFrame().Concat(new Row[]
    {
        new(MonWedFri, "08:45", "10:00", "Vật lý trị liệu (gập duỗi gối, nâng chân, tập đi khung/nạng, lên xuống bậc)", "ACTIVITY", 75, Nurse, "Đi lại được, tự làm việc sinh hoạt", "Thử nghiệm: 45–90 phút × 3 buổi/tuần; Cochrane CD001704"),
        new(TueThuSat, "08:45", "09:15", "Tập nhẹ duy trì", "ACTIVITY", 30, Nurse, "Giữ sức; không tập quá nặng (dễ bỏ tập)", "Cochrane CD001704"),
        new(EveryDay, "10:30", "11:00", "Đi bộ có người dìu", "ACTIVITY", 30, Caregiver, "Tập đi trong tình huống thật"),
        new(EveryDay, "14:00", "14:30", "Ngâm chân, massage chân", "ACTIVITY", 30, Caregiver, "Thư giãn cơ", "(*)", Required: false),
    });

    private static IEnumerable<Row> Dementia() => CommonFrame().Concat(new Row[]
    {
        new(EveryDay, "07:00", "07:45", "Ngồi gần cửa sổ, nhận ánh sáng tự nhiên buổi sáng", "MOOD", null, Caregiver, "Giảm kích động, hung hăng, đi lang thang", "Guu et al. 2022 (PMC9324910)"),
        new(new byte[] { 1, 4 }, "08:45", "10:15", "Kích thích nhận thức (CST): ngày tháng, thời sự, phân loại đồ vật", "ACTIVITY", 90, Nurse, "Giữ trí nhớ và khả năng suy nghĩ", "CST trials: 50–90 phút, 1–2 buổi/tuần"),
        new(new byte[] { 2 }, "08:45", "09:15", "Liệu pháp hồi tưởng (ảnh cũ, kể chuyện quê)", "ACTIVITY", 30, Caregiver, "Tăng giao tiếp", "Cochrane – reminiscence therapy"),
        new(new byte[] { 3, 5 }, "08:45", "09:30", "Âm nhạc theo sở thích của cụ", "ACTIVITY", 45, Caregiver, "Có thể giảm trầm cảm, rối loạn hành vi", "Cochrane – music-based therapy"),
        new(new byte[] { 6 }, "08:45", "09:45", "Cắm hoa, làm đồ thủ công", "ACTIVITY", 60, Caregiver, "Cụ thấy mình có ích", "(*)"),
        new(EveryDay, "10:30", "11:00", "Đi bộ có người đi kèm (không để gần cửa ra vào)", "ACTIVITY", 30, Caregiver, "Vận động, giữ an toàn"),
        new(EveryDay, "14:00", "15:00", "Việc quen tay (gấp khăn, nghe nhạc), tránh chỗ đông và ồn", "ACTIVITY", 60, Caregiver, "Giữ cụ bình tĩnh", Required: false),
        new(EveryDay, "15:00", "16:30", "Theo dõi đổi tính về chiều (bồn chồn, đòi về), nhắc trước giờ về", "MOOD", null, Caregiver, "Phát hiện \"hội chứng hoàng hôn\"", "Dementia UK – sundowning"),
    });

    private static IEnumerable<Row> Stroke() => CommonFrame(withWarmUp: false).Concat(new Row[]
    {
        new(EveryDay, "07:00", "07:15", "Kiểm tra dấu hiệu tái phát (nói khó, yếu tay chân tăng, méo miệng)", "NOTE", null, Nurse, "Phát hiện sớm để chuyển viện kịp", "(*)"),
        new(EveryDay, "07:15", "07:45", "Kiểm tra nuốt trước bữa, thức ăn mềm, chỗ yên tĩnh", "MEAL", null, Caregiver, "Tránh sặc và viêm phổi", "American Stroke Association; Canadian Stroke Best Practices"),
        new(EveryDay, "08:15", "08:45", "Tập chủ động bên khỏe, tập thụ động bên liệt", "ACTIVITY", 30, Caregiver, "Giữ tầm vận động, chống co rút"),
        new(EveryDay, "08:45", "09:45", "Vật lý trị liệu (thăng bằng, tập đi, sức cơ bên liệt)", "ACTIVITY", 60, Nurse, "Đi lại được", "NICE NG236: vật lý trị liệu 1–2 giờ/ngày"),
        new(EveryDay, "09:45", "10:30", "Hoạt động trị liệu + tập nói (cầm thìa, cài nút, đọc to)", "ACTIVITY", 45, Nurse, "Tự ăn, tự mặc, giao tiếp được", "NICE NG236"),
        new(EveryDay, "10:30", "11:00", "Đi bộ có người dìu phía bên liệt", "ACTIVITY", 30, Caregiver, "Phòng té"),
        new(EveryDay, "12:00", "12:15", "Đổi tư thế, đặt tay chân bên liệt đúng tư thế", "NOTE", null, Caregiver, "Chống đau vai, loét", "(*)"),
        new(EveryDay, "13:30", "14:00", "Đo huyết áp chiều", "VITALS", null, Nurse, "Huyết áp cao làm tăng nguy cơ tái phát", "(*)"),
        new(EveryDay, "14:00", "15:00", "Tập đợt 2 (vật lý trị liệu hoặc hoạt động trị liệu)", "ACTIVITY", 60, Nurse, "Cộng buổi sáng gần 3 giờ/ngày", "NICE NG236: ≥3 giờ/ngày, ≥5 ngày/tuần"),
    });

    private static IEnumerable<Row> EndOfLife() => CommonFrame(withWarmUp: false).Concat(new Row[]
    {
        new(EveryDay, "09:00", "09:15", "Đổi tư thế, kiểm tra da (lần 1)", "NOTE", null, Caregiver, "Chống loét", "(*)"),
        new(EveryDay, "10:00", "10:15", "Đánh giá đau, khó thở (buổi sáng)", "VITALS", null, Nurse, "Giữ cụ dễ chịu", "(*)"),
        new(EveryDay, "10:30", "10:45", "Chăm sóc miệng, vệ sinh", "HYGIENE", null, Caregiver, "Thoải mái", "(*)"),
        new(EveryDay, "13:00", "13:15", "Đổi tư thế, kiểm tra da (lần 2)", "NOTE", null, Caregiver, "Chống loét", "(*)"),
        new(EveryDay, "14:00", "14:15", "Đánh giá đau, khó thở (buổi chiều)", "VITALS", null, Nurse, "Giữ cụ dễ chịu", "(*)"),
        new(EveryDay, "14:30", "15:00", "Nghe nhạc, gia đình gọi video", "ACTIVITY", 30, Caregiver, "Tinh thần", "(*)", Required: false),
    });

    public static async Task SeedAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        var packages = await context.ServicePackages
            .Select(p => new { p.PackageId, p.PackageName, HasActivities = p.PackageActivities.Any() })
            .ToListAsync(cancellationToken);

        var added = false;
        foreach (var package in packages.Where(p => !p.HasActivities))
        {
            var rows = RowsFor(package.PackageName);
            if (rows == null) continue;

            var order = 0;
            foreach (var row in rows.OrderBy(r => r.Start).ThenBy(r => r.Condition != null))
            {
                var days = row.Days.Length == 0 ? new byte?[] { null } : row.Days.Select(d => (byte?)d).ToArray();
                foreach (var day in days)
                {
                    context.PackageActivities.Add(new PackageActivity
                    {
                        PackageId = package.PackageId,
                        DayOfWeek = day,
                        StartTime = TimeOnly.ParseExact(row.Start, "HH:mm", CultureInfo.InvariantCulture),
                        EndTime = TimeOnly.ParseExact(row.End, "HH:mm", CultureInfo.InvariantCulture),
                        DisplayOrder = ++order,
                        IsActive = true,
                        ActivityName = row.Name,
                        Purpose = row.Purpose,
                        CareType = row.CareType,
                        TargetMinutes = row.Minutes,
                        PerformerRole = row.Role,
                        IsRequired = row.Required,
                        ConditionCode = row.Condition,
                        Source = row.Source,
                    });
                }
            }
            added = true;
        }

        if (added) await context.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Chọn lịch mẫu theo tên gói (không phân biệt dấu, hoa thường). Gói lạ thì không seed.</summary>
    private static IEnumerable<Row>? RowsFor(string packageName)
    {
        var name = Plain(packageName);
        if (name.Contains("phuc hoi")) return Rehab();
        if (name.Contains("sa sut") || name.Contains("tri nho")) return Dementia();
        if (name.Contains("tai bien") || name.Contains("dot quy")) return Stroke();
        if (name.Contains("giai doan cuoi")) return EndOfLife();
        if (name.Contains("co ban")) return Basic();
        return null;
    }

    private static string Plain(string value)
    {
        var normalized = value.Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var c in normalized)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) builder.Append(c);
        return builder.ToString().ToLowerInvariant();
    }
}
