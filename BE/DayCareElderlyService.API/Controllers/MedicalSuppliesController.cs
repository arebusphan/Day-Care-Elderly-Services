using System.Threading.Tasks;
using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.MedicalSupply;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/medical-supplies")]
[Authorize(Roles = "Staff,Center,CenterManager,Admin")]
public class MedicalSuppliesController : ControllerBase
{
    private readonly IMedicalSupplyService _supplyService;

    public MedicalSuppliesController(IMedicalSupplyService supplyService)
    {
        _supplyService = supplyService;
    }

    private int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : null;
    }

    /// <summary>
    /// Thêm vật tư y tế mới
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateSupply([FromBody] CreateMedicalSupplyDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<MedicalSupplyDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _supplyService.CreateMedicalSupplyAsync(dto, GetCurrentUserId());
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Lấy danh sách vật tư y tế (hỗ trợ phân trang và tìm kiếm)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<MedicalSupplyDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSupplies([FromQuery] MedicalSupplyFilterDto filter)
    {
        var result = await _supplyService.GetMedicalSuppliesPagedAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Xem chi tiết một vật tư y tế theo ID
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetSupplyById(int id)
    {
        var result = await _supplyService.GetMedicalSupplyByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin cơ bản của vật tư (không cập nhật số lượng tồn kho hay trạng thái tại đây)
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateSupply(int id, [FromBody] UpdateMedicalSupplyDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<MedicalSupplyDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _supplyService.UpdateMedicalSupplyAsync(id, dto, GetCurrentUserId());
        if (!result.Success)
        {
            if (result.Errors?.Contains("SUPPLY_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Điều chỉnh số lượng tồn kho (tăng số dương hoặc giảm số âm, không cho phép tồn kho âm)
    /// </summary>
    [HttpPatch("{id:int}/stock")]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> AdjustStock(int id, [FromBody] AdjustStockDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<MedicalSupplyDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _supplyService.AdjustStockAsync(id, dto, GetCurrentUserId());
        if (!result.Success)
        {
            if (result.Errors?.Contains("SUPPLY_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Bật/tắt trạng thái hoạt động của vật tư (IsActive)
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<MedicalSupplyDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var result = await _supplyService.ToggleStatusAsync(id, GetCurrentUserId());
        if (!result.Success)
        {
            if (result.Errors?.Contains("SUPPLY_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }
}
