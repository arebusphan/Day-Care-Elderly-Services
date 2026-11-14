using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

/// <summary>
/// Áp dụng Migrations/Apply_AddOperationsFeatures.sql (idempotent) khi BE khởi động,
/// để DB của mọi thành viên tự có các bảng / cột mới mà không cần chạy script tay.
/// (EF migrations snapshot hiện không dùng được để sinh migration mới.)
/// </summary>
public static class OperationsSchema
{
    private const string ResourceName = "Apply_AddOperationsFeatures.sql";

    public static async Task EnsureAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        await using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Không tìm thấy script nhúng {ResourceName}.");
        using var reader = new StreamReader(stream);
        var sql = await reader.ReadToEndAsync(cancellationToken);
        await context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
    }
}
