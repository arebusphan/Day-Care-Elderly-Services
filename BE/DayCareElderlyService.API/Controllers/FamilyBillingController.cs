using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Billing;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/family")]
[Authorize]
public class FamilyBillingController : ControllerBase
{
    private readonly IBillingService _billingService;
    private readonly ILogger<FamilyBillingController> _logger;

    public FamilyBillingController(IBillingService billingService, ILogger<FamilyBillingController> logger)
    {
        _billingService = billingService;
        _logger = logger;
    }

    private Guid? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirst("nameid")?.Value;

        if (Guid.TryParse(idStr, out var id))
        {
            return id;
        }
        return null;
    }

    /// <summary>
    /// Lấy danh sách gói dịch vụ đang hoạt động
    /// </summary>
    [HttpGet("packages")]
    [ProducesResponseType(typeof(ApiResponse<List<ServicePackageDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActivePackages()
    {
        try
        {
            var result = await _billingService.GetActivePackagesAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách gói dịch vụ");
            return StatusCode(500, ApiResponse.Fail("Đã xảy ra lỗi hệ thống."));
        }
    }

    /// <summary>
    /// Đăng ký gói dịch vụ cho người cao tuổi
    /// </summary>
    [HttpPost("packages/register")]
    [ProducesResponseType(typeof(ApiResponse<ServiceRegistrationResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ServiceRegistrationResultDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RegisterServicePackage([FromBody] CreateServiceRegistrationDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<ServiceRegistrationResultDto>.Fail("Dữ liệu không hợp lệ.", errors));
            }

            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được người dùng."));
            }

            var result = await _billingService.RegisterServicePackageAsync(userId.Value, dto);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đăng ký gói dịch vụ: {Message}", ex.Message);
            var detail = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, ApiResponse.Fail($"Lỗi khi đăng ký gói dịch vụ: {detail}"));
        }
    }

    /// <summary>
    /// Lấy danh sách hóa đơn của gia đình
    /// </summary>
    [HttpGet("billing/invoices")]
    [ProducesResponseType(typeof(ApiResponse<List<InvoiceDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyInvoices()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được người dùng."));
            }

            var result = await _billingService.GetMyInvoicesAsync(userId.Value);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách hóa đơn");
            return StatusCode(500, ApiResponse.Fail("Đã xảy ra lỗi hệ thống."));
        }
    }

    /// <summary>
    /// Lấy chi tiết một hóa đơn theo mã
    /// </summary>
    [HttpGet("billing/invoices/{invoiceNo}")]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<InvoiceDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetInvoiceDetail(string invoiceNo)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse.Fail("Không xác định được người dùng."));
            }

            var result = await _billingService.GetInvoiceByIdAsync(userId.Value, invoiceNo);
            if (!result.Success)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy chi tiết hóa đơn {InvoiceNo}", invoiceNo);
            return StatusCode(500, ApiResponse.Fail("Đã xảy ra lỗi hệ thống."));
        }
    }
}
