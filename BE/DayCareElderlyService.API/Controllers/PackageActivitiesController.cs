using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Schedule;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Lịch hoạt động mẫu theo gói (đối tượng bệnh) — docs/thiet-ke-lich-hoat-dong-theo-goi.md.
/// Quản lý trung tâm và Admin xem / thêm / sửa / ẩn hoạt động.
/// </summary>
[ApiController]
[Route("api/center")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class PackageActivitiesController : ControllerBase
{
    private readonly IPackageActivityService _service;
    private readonly ILogger<PackageActivitiesController> _logger;

    public PackageActivitiesController(IPackageActivityService service, ILogger<PackageActivitiesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    public class SetActiveDto
    {
        public bool IsActive { get; set; }
    }

    /// <summary>Danh sách gói + số hoạt động trong lịch</summary>
    [HttpGet("packages")]
    public Task<IActionResult> GetPackages() =>
        RunAsync(_ => _service.GetPackagesAsync(), "lấy danh sách gói");

    /// <summary>Lịch hoạt động của gói (includeInactive = true để thấy cả hoạt động đã ẩn)</summary>
    [HttpGet("packages/{packageId:int}/activities")]
    public Task<IActionResult> GetActivities(int packageId, [FromQuery] bool includeInactive = false) =>
        RunAsync(_ => _service.GetActivitiesAsync(packageId, includeInactive), "lấy lịch hoạt động");

    [HttpPost("packages/{packageId:int}/activities")]
    public Task<IActionResult> Create(int packageId, [FromBody] UpsertPackageActivityDto dto) =>
        RunAsync(userId => _service.CreateAsync(userId, packageId, dto), "thêm hoạt động");

    [HttpPut("package-activities/{id:int}")]
    public Task<IActionResult> Update(int id, [FromBody] UpsertPackageActivityDto dto) =>
        RunAsync(userId => _service.UpdateAsync(userId, id, dto), "sửa hoạt động");

    /// <summary>Ẩn / hiện hoạt động (không xóa cứng để giữ liên kết care log cũ)</summary>
    [HttpPatch("package-activities/{id:int}/active")]
    public Task<IActionResult> SetActive(int id, [FromBody] SetActiveDto dto) =>
        RunAsync(userId => _service.SetActiveAsync(userId, id, dto.IsActive), "ẩn / hiện hoạt động");

    private async Task<IActionResult> RunAsync<T>(Func<int, Task<ApiResponse<T>>> action, string actionName)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<T>.Fail("Dữ liệu không hợp lệ.",
                ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList()));
        }

        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var userId))
        {
            return Unauthorized(ApiResponse<T>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
        }

        try
        {
            var result = await action(userId);
            return result.Success ? Ok(result) : BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi {Action}", actionName);
            return StatusCode(500, ApiResponse<T>.Fail($"Lỗi máy chủ khi {actionName}."));
        }
    }
}
