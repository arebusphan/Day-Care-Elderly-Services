using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;

namespace DayCareElderlyService.BLL.Services;

/// <summary>
/// Thay đổi tồn kho vật tư qua sổ cái SupplyTransactions (quyết định D2 trong Design Brief)
/// và cảnh báo quản lý khi tồn kho vừa xuống mức tối thiểu (F-14).
/// Không gọi SaveChanges — để nơi gọi lưu trong cùng một lần.
/// </summary>
public static class SupplyStock
{
    public const string TypeIn = "IN";
    public const string TypeOut = "OUT";
    public const string TypeIncident = "INCIDENT";
    public const string LowStockNotificationType = "LowStock";

    /// <summary>
    /// Cộng/trừ tồn kho, ghi một dòng SupplyTransaction (khi biết người thực hiện) và cảnh báo nếu vừa chạm mức tối thiểu.
    /// </summary>
    public static async Task ApplyAsync(AppDbContext context, MedicalSupply supply, decimal delta, string transactionType,
        int? recordedBy, string? notes, int? incidentId = null, decimal? unitPrice = null)
    {
        var previous = supply.QuantityInStock;
        supply.QuantityInStock = previous + delta;

        if (recordedBy.HasValue)
        {
            await context.SupplyTransactions.AddAsync(new SupplyTransaction
            {
                SupplyId = supply.SupplyId,
                TransactionType = transactionType,
                Quantity = Math.Abs(delta),
                OccurredAt = VietnamTime.Now,
                RecordedBy = recordedBy.Value,
                Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
                IncidentId = incidentId,
                UnitPrice = unitPrice
            });
        }

        if (previous > supply.MinimumStock && supply.QuantityInStock <= supply.MinimumStock)
        {
            await CareLogShared.NotifyManagersAsync(context,
                $"Vật tư sắp hết: {supply.SupplyName}",
                $"Tồn kho còn {supply.QuantityInStock:0.##} {supply.Unit} (mức tối thiểu {supply.MinimumStock:0.##}). Vui lòng nhập thêm.",
                LowStockNotificationType, nameof(MedicalSupply), supply.SupplyId);
        }
    }
}
