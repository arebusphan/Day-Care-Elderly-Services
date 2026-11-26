using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

/// <summary>
/// Áp dụng các script Migrations/Apply_*.sql (idempotent) khi BE khởi động,
/// để DB của mọi thành viên tự có các bảng / cột mới mà không cần chạy script tay.
/// (EF migrations snapshot hiện không dùng được để sinh migration mới.)
/// </summary>
public static class OperationsSchema
{
    /// <summary>Chạy theo thứ tự; script sau có thể dựa vào bảng của script trước.</summary>
    private static readonly string[] ResourceNames =
    {
        "Apply_AddOperationsFeatures.sql",
        "Apply_AddPackageActivitySchedule.sql",
    };

    public static async Task EnsureAsync(AppDbContext context, CancellationToken cancellationToken = default)
    {
        foreach (var resourceName in ResourceNames)
        {
            await using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException($"Không tìm thấy script nhúng {resourceName}.");
            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync(cancellationToken);
            await context.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        await PackageActivitySeeder.SeedAsync(context, cancellationToken);
    }
}
