using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.DTOs.IncidentReport;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// F-14 / WF-05: vật tư đã dùng khi xử lý sự cố (trừ kho, phí riêng) và ảnh sự cố.
/// </summary>
[ApiController]
[Route("api/incident-reports")]
[Authorize(Roles = "Staff,Center,CenterManager,Admin")]
public class IncidentOperationsController : ControllerBase
{
    private readonly IIncidentOperationsService _service;

    public IncidentOperationsController(IIncidentOperationsService service)
    {
        _service = service;
    }

    /// <summary>Danh sách vật tư đã dùng cho sự cố</summary>
    [HttpGet("{id:int}/supplies")]
    [ProducesResponseType(typeof(ApiResponse<List<IncidentSupplyUsageDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSupplies(int id) => Map(await _service.GetSupplyUsageAsync(id));

    /// <summary>Ghi vật tư đã dùng: trừ kho, cộng phí riêng, báo gia đình</summary>
    [HttpPost("{id:int}/supplies")]
    [ProducesResponseType(typeof(ApiResponse<List<IncidentSupplyUsageDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<IncidentSupplyUsageDto>>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RecordSupplies(int id, [FromBody] RecordIncidentSuppliesDto dto)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));
        return Map(await _service.RecordSuppliesAsync(userId.Value, id, dto));
    }

    /// <summary>Tải ảnh sự cố (jpg/png/webp, tối đa 5MB/ảnh, 10 ảnh/sự cố)</summary>
    [HttpPost("{id:int}/photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(60 * 1024 * 1024)]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadPhotos(int id, [FromForm] List<IFormFile> files)
    {
        var userId = CurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<object>.Fail("Không xác thực được người dùng."));

        var uploads = files.Select(f => new PhotoUploadFile
        {
            Content = f.OpenReadStream(),
            FileName = f.FileName,
            ContentType = f.ContentType ?? string.Empty,
            Length = f.Length
        }).ToList();
        try
        {
            return Map(await _service.AddPhotosAsync(userId.Value, id, uploads));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<List<string>>.Fail(ex.Message));
        }
        finally
        {
            foreach (var u in uploads) u.Content.Dispose();
        }
    }

    private IActionResult Map<T>(ApiResponse<T> result)
    {
        if (result.Success) return Ok(result);
        if (result.Errors?.Contains("INCIDENT_NOT_FOUND") == true) return NotFound(result);
        return BadRequest(result);
    }

    private int? CurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(idStr, out var id) ? id : null;
    }
}
