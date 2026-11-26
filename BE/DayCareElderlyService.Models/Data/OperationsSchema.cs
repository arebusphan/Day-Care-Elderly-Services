using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

/// <summary>
/// Explicit helper for applying the idempotent Migrations/Apply_*.sql scripts.
/// It is not called automatically when the API starts.
/// (The current EF migrations snapshot cannot generate new migrations.)
/// </summary>
public static class OperationsSchema
{
    /// <summary>Runs scripts in order; later scripts may depend on earlier ones.</summary>
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
