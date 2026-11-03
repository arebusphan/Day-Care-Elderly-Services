using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DayCareElderlyService.BLL.Services;

public class MedicalSupplyService : IMedicalSupplyService
{
    private readonly AppDbContext _context;
    private readonly ILogger<MedicalSupplyService> _logger;

    public MedicalSupplyService(AppDbContext context, ILogger<MedicalSupplyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ApiResponse<MedicalSupplyDto>> CreateMedicalSupplyAsync(CreateMedicalSupplyDto dto)
    {
        try
        {
            if (dto.MinimumStock < 0)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Mức tồn kho tối thiểu không được âm.");
            }

            if (dto.QuantityInStock < 0)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Số lượng tồn kho ban đầu không được âm.");
            }

            var supply = new MedicalSupply
            {
                SupplyName = dto.SupplyName.Trim(),
                Unit = dto.Unit.Trim(),
                MinimumStock = dto.MinimumStock,
                QuantityInStock = dto.QuantityInStock,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _context.MedicalSupplies.AddAsync(supply);
            await _context.SaveChangesAsync();


            return ApiResponse<MedicalSupplyDto>.Ok(MapToDto(supply), "Thêm vật tư y tế thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi thêm vật tư y tế mới");
            return ApiResponse<MedicalSupplyDto>.Fail("Đã xảy ra lỗi hệ thống khi thêm vật tư.");
        }
    }

    public async Task<ApiResponse<PagedResult<MedicalSupplyDto>>> GetMedicalSuppliesPagedAsync(MedicalSupplyFilterDto filter)
    {
        try
        {
            var query = _context.MedicalSupplies.AsNoTracking();

            if (filter.IsActive.HasValue)
            {
                query = query.Where(s => s.IsActive == filter.IsActive.Value);
            }

            if (filter.IsLowStock == true)
            {
                query = query.Where(s => s.QuantityInStock <= s.MinimumStock);
            }

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var term = filter.Search.Trim().ToLower();
                query = query.Where(s => s.SupplyName.ToLower().Contains(term) || s.Unit.ToLower().Contains(term));
            }

            var totalItems = await query.CountAsync();
            var pageNumber = filter.PageNumber < 1 ? 1 : filter.PageNumber;
            var pageSize = filter.PageSize < 1 ? 10 : (filter.PageSize > 100 ? 100 : filter.PageSize);

            var items = await query
                .OrderBy(s => s.SupplyName)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(s => MapToDto(s))
                .ToListAsync();

            var pagedResult = new PagedResult<MedicalSupplyDto>(items, totalItems, pageNumber, pageSize);
            return ApiResponse<PagedResult<MedicalSupplyDto>>.Ok(pagedResult, "Lấy danh sách vật tư thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách vật tư y tế phân trang");
            return ApiResponse<PagedResult<MedicalSupplyDto>>.Fail("Đã xảy ra lỗi hệ thống khi lấy danh sách vật tư.");
        }
    }

    public async Task<ApiResponse<MedicalSupplyDto>> GetMedicalSupplyByIdAsync(int supplyId)
    {
        try
        {
            var supply = await _context.MedicalSupplies
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SupplyId == supplyId);

            if (supply == null)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Không tìm thấy vật tư y tế.", new List<string> { "SUPPLY_NOT_FOUND" });
            }

            return ApiResponse<MedicalSupplyDto>.Ok(MapToDto(supply), "Lấy chi tiết vật tư thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết vật tư {SupplyId}", supplyId);
            return ApiResponse<MedicalSupplyDto>.Fail("Đã xảy ra lỗi hệ thống khi lấy chi tiết vật tư.");
        }
    }

    public async Task<ApiResponse<MedicalSupplyDto>> UpdateMedicalSupplyAsync(int supplyId, UpdateMedicalSupplyDto dto)
    {
        try
        {
            var supply = await _context.MedicalSupplies
                .FirstOrDefaultAsync(s => s.SupplyId == supplyId);

            if (supply == null)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Không tìm thấy vật tư y tế.", new List<string> { "SUPPLY_NOT_FOUND" });
            }

            if (dto.MinimumStock < 0)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Mức tồn kho tối thiểu không được âm.");
            }

            // Chỉ cập nhật các trường được phép
            supply.SupplyName = dto.SupplyName.Trim();
            supply.Unit = dto.Unit.Trim();
            supply.MinimumStock = dto.MinimumStock;

            await _context.SaveChangesAsync();

            return ApiResponse<MedicalSupplyDto>.Ok(MapToDto(supply), "Cập nhật thông tin vật tư thành công.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi cập nhật thông tin vật tư {SupplyId}", supplyId);
            return ApiResponse<MedicalSupplyDto>.Fail("Đã xảy ra lỗi hệ thống khi cập nhật thông tin vật tư.");
        }
    }

    public async Task<ApiResponse<MedicalSupplyDto>> AdjustStockAsync(int supplyId, AdjustStockDto dto)
    {
        try
        {
            var supply = await _context.MedicalSupplies
                .FirstOrDefaultAsync(s => s.SupplyId == supplyId);

            if (supply == null)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Không tìm thấy vật tư y tế.", new List<string> { "SUPPLY_NOT_FOUND" });
            }

            var newStock = supply.QuantityInStock + dto.AdjustmentQuantity;
            if (newStock < 0)
            {
                return ApiResponse<MedicalSupplyDto>.Fail(
                    $"Số lượng tồn kho không được âm. Tồn hiện tại: {supply.QuantityInStock}, số lượng điều chỉnh: {dto.AdjustmentQuantity}, tồn kho mới tính toán: {newStock}.",
                    new List<string> { "INVALID_STOCK_QUANTITY" });
            }

            supply.QuantityInStock = newStock;
            await _context.SaveChangesAsync();

            string message = newStock <= supply.MinimumStock
                ? $"Điều chỉnh tồn kho thành công ({newStock} {supply.Unit}). CẢNH BÁO: Vật tư sắp hết (tồn kho hiện tại <= mức tối thiểu {supply.MinimumStock})!"
                : $"Điều chỉnh tồn kho thành công. Tồn kho hiện tại: {newStock} {supply.Unit}.";

            return ApiResponse<MedicalSupplyDto>.Ok(MapToDto(supply), message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi điều chỉnh số lượng tồn kho vật tư {SupplyId}", supplyId);
            return ApiResponse<MedicalSupplyDto>.Fail("Đã xảy ra lỗi hệ thống khi điều chỉnh tồn kho.");
        }
    }

    public async Task<ApiResponse<MedicalSupplyDto>> ToggleStatusAsync(int supplyId)
    {
        try
        {
            var supply = await _context.MedicalSupplies
                .FirstOrDefaultAsync(s => s.SupplyId == supplyId);

            if (supply == null)
            {
                return ApiResponse<MedicalSupplyDto>.Fail("Không tìm thấy vật tư y tế.", new List<string> { "SUPPLY_NOT_FOUND" });
            }

            // Chuyển trạng thái theo quy ước bool IsActive hiện có
            supply.IsActive = !supply.IsActive;
            await _context.SaveChangesAsync();

            var statusText = supply.IsActive ? "kích hoạt hoạt động" : "tắt trạng thái hoạt động";
            return ApiResponse<MedicalSupplyDto>.Ok(MapToDto(supply), $"Đã {statusText} cho vật tư '{supply.SupplyName}'.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi bật/tắt trạng thái vật tư {SupplyId}", supplyId);
            return ApiResponse<MedicalSupplyDto>.Fail("Đã xảy ra lỗi hệ thống khi chuyển trạng thái vật tư.");
        }
    }

    private static MedicalSupplyDto MapToDto(MedicalSupply s)
    {
        return new MedicalSupplyDto
        {
            SupplyId = s.SupplyId,
            SupplyName = s.SupplyName,
            Unit = s.Unit,
            MinimumStock = s.MinimumStock,
            QuantityInStock = s.QuantityInStock,
            IsActive = s.IsActive,
            CreatedAt = s.CreatedAt
        };
    }
}
