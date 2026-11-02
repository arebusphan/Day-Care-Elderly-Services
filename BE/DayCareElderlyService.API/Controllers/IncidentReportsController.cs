using System.Security.Claims;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.IncidentReport;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/incident-reports")]
[Authorize(Roles = "Staff,Center,CenterManager,Admin")]
public class IncidentReportsController : ControllerBase
{
    private readonly IIncidentReportService _incidentService;

    public IncidentReportsController(IIncidentReportService incidentService)
    {
        _incidentService = incidentService;
    }

    private int? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirstValue("id")
                 ?? User.FindFirst("nameid")?.Value;

        if (int.TryParse(idStr, out var id))
        {
            return id;
        }
        return null;
    }

    /// <summary>
    /// Tạo sự cố mới
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateIncident([FromBody] CreateIncidentReportDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<IncidentReportDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(ApiResponse.Fail("Không xác định được danh tính người dùng."));
        }

        var result = await _incidentService.CreateIncidentAsync(userId.Value, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>
    /// Lấy danh sách sự cố có lọc và phân trang
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<IncidentReportDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetIncidents([FromQuery] IncidentReportFilterDto filter)
    {
        var result = await _incidentService.GetIncidentsPagedAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Xem chi tiết một sự cố theo ID
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetIncidentById(int id)
    {
        var result = await _incidentService.GetIncidentByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật thông tin sự cố (không cho phép sửa IsSupplyConfirmed tại đây)
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateIncident(int id, [FromBody] UpdateIncidentReportDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<IncidentReportDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _incidentService.UpdateIncidentAsync(id, dto);
        if (!result.Success)
        {
            if (result.Errors?.Contains("INCIDENT_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái xử lý sự cố (Open, InProgress, Resolved)
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateIncidentStatusDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<IncidentReportDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _incidentService.UpdateIncidentStatusAsync(id, dto);
        if (!result.Success)
        {
            if (result.Errors?.Contains("INCIDENT_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xác nhận hoặc hủy xác nhận vật tư cho sự cố
    /// </summary>
    [HttpPatch("{id:int}/supply-confirmation")]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<IncidentReportDto>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateSupplyConfirmation(int id, [FromBody] UpdateSupplyConfirmationDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<IncidentReportDto>.Fail("Dữ liệu không hợp lệ.", errors));
        }

        var result = await _incidentService.UpdateSupplyConfirmationAsync(id, dto);
        if (!result.Success)
        {
            if (result.Errors?.Contains("INCIDENT_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa sự cố chưa xác nhận vật tư (Trả về 409 Conflict nếu đã xác nhận vật tư)
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteIncident(int id)
    {
        var result = await _incidentService.DeleteIncidentAsync(id);
        if (!result.Success)
        {
            if (result.Errors?.Contains("INCIDENT_NOT_FOUND") == true)
            {
                return NotFound(result);
            }
            if (result.Errors?.Contains("SUPPLY_ALREADY_CONFIRMED") == true)
            {
                return StatusCode(StatusCodes.Status409Conflict, result);
            }
            return BadRequest(result);
        }

        return Ok(result);
    }
}
