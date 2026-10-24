using System.Security.Claims;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// Care log phía nhân viên: ghi care log, đo chỉ số, cho uống thuốc, sự cố, chốt ngày
/// </summary>
[ApiController]
[Route("api/staff")]
[Authorize(Roles = "Staff")]
public class StaffCareLogController : ControllerBase
{
    private readonly ICareLogService _careLogService;
    private readonly ILogger<StaffCareLogController> _logger;

    public StaffCareLogController(ICareLogService careLogService, ILogger<StaffCareLogController> logger)
    {
        _careLogService = careLogService;
        _logger = logger;
    }

    /// <summary>
    /// Danh sách người cao tuổi đã check-in hôm nay ở trung tâm của nhân viên
    /// </summary>
    [HttpGet("elderly/today")]
    [ProducesResponseType(typeof(ApiResponse<List<StaffElderlyTodayDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetTodayElderly() =>
        RunAsync(userId => _careLogService.GetTodayElderlyAsync(userId), "lấy danh sách người cao tuổi hôm nay");

    /// <summary>
    /// Lịch hoạt động hôm nay của trung tâm, đánh dấu hoạt động nhân viên được phân công
    /// </summary>
    [HttpGet("activities/today")]
    [ProducesResponseType(typeof(ApiResponse<List<ActivityTodayDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetTodayActivities() =>
        RunAsync(userId => _careLogService.GetTodayActivitiesAsync(userId), "lấy lịch hoạt động hôm nay");

    /// <summary>
    /// Care log 1 ngày của 1 cụ (mặc định hôm nay), gồm cả mục nội bộ
    /// </summary>
    [HttpGet("care-logs/{elderlyId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetDay(Guid elderlyId, [FromQuery] DateOnly? date) =>
        RunAsync(userId => _careLogService.GetDayAsync(userId, elderlyId, date), "lấy care log");

    /// <summary>
    /// Ghi 1 mục care log: MEAL, HYGIENE, NAP, MOOD, ACTIVITY, NOTE
    /// </summary>
    [HttpPost("care-logs/{elderlyId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CareLogEntryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CareLogEntryDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> AddEntry(Guid elderlyId, [FromBody] CreateCareLogEntryDto dto) =>
        RunAsync(userId => _careLogService.AddEntryAsync(userId, elderlyId, dto), "ghi care log");

    /// <summary>
    /// Đính kèm ảnh cho 1 mục care log hôm nay (jpg/png/webp, tối đa 5MB/ảnh, 5 ảnh/mục). Ảnh lưu trên Cloudinary.
    /// </summary>
    [HttpPost("care-logs/entries/{careLogId:guid}/photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    [ProducesResponseType(typeof(ApiResponse<List<CareLogPhotoDto>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<List<CareLogPhotoDto>>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadPhotos(Guid careLogId, [FromForm] List<IFormFile> files)
    {
        var uploads = files.Select(f => new PhotoUploadFile
        {
            Content = f.OpenReadStream(),
            FileName = f.FileName,
            ContentType = f.ContentType ?? string.Empty,
            Length = f.Length
        }).ToList();

        try
        {
            return await RunAsync(userId => _careLogService.AddPhotosAsync(userId, careLogId, uploads), "tải ảnh");
        }
        finally
        {
            foreach (var upload in uploads)
            {
                upload.Content.Dispose();
            }
        }
    }

    /// <summary>
    /// Xoá 1 ảnh của care log hôm nay (chưa chốt). Xoá cả trên Cloudinary.
    /// </summary>
    [HttpDelete("care-logs/photos/{photoId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> DeletePhoto(Guid photoId) =>
        RunAsync(userId => _careLogService.DeletePhotoAsync(userId, photoId), "xoá ảnh");

    /// <summary>
    /// Đo chỉ số (điều dưỡng). Vượt ngưỡng thì tạo sự cố VITALS_ALERT và báo gia đình.
    /// </summary>
    [HttpPost("care-logs/{elderlyId:guid}/vitals")]
    [ProducesResponseType(typeof(ApiResponse<VitalsResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<VitalsResultDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> RecordVitals(Guid elderlyId, [FromBody] RecordVitalsDto dto) =>
        RunAsync(userId => _careLogService.RecordVitalsAsync(userId, elderlyId, dto), "ghi chỉ số");

    /// <summary>
    /// Điều dưỡng xác nhận xong phần y tế trong ngày
    /// </summary>
    [HttpPost("care-logs/{elderlyId:guid}/medical-done")]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> MarkMedicalDone(Guid elderlyId, [FromBody] CareLogNoteDto? dto) =>
        RunAsync(userId => _careLogService.MarkMedicalDoneAsync(userId, elderlyId, dto ?? new CareLogNoteDto()), "xác nhận xong phần y tế");

    /// <summary>
    /// Hộ lý chốt care log trong ngày (sau khi điều dưỡng xong phần y tế). Sau khi chốt không ghi thêm được.
    /// </summary>
    [HttpPost("care-logs/{elderlyId:guid}/close")]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<CareLogDayDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> CloseDay(Guid elderlyId, [FromBody] CareLogNoteDto? dto) =>
        RunAsync(userId => _careLogService.CloseDayAsync(userId, elderlyId, dto ?? new CareLogNoteDto()), "chốt care log");

    /// <summary>
    /// Thuốc đến hạn hôm nay của các cụ trong trung tâm
    /// </summary>
    [HttpGet("doses/today")]
    [ProducesResponseType(typeof(ApiResponse<List<DoseDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetTodayDoses() =>
        RunAsync(userId => _careLogService.GetTodayDosesAsync(userId), "lấy danh sách thuốc hôm nay");

    /// <summary>
    /// Ghi nhận cho uống thuốc (điều dưỡng): Given / Refused / Missed
    /// </summary>
    [HttpPatch("doses/{medicationRecordId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DoseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<DoseDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> UpdateDose(Guid medicationRecordId, [FromBody] UpdateDoseDto dto) =>
        RunAsync(userId => _careLogService.UpdateDoseAsync(userId, medicationRecordId, dto), "ghi nhận thuốc");

    /// <summary>
    /// Sự cố / cảnh báo của trung tâm trong N ngày gần nhất (mặc định 30). Lọc theo status: Open, InProgress, Resolved.
    /// </summary>
    [HttpGet("incidents")]
    [ProducesResponseType(typeof(ApiResponse<List<IncidentDto>>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetIncidents([FromQuery] string? status, [FromQuery] int days = 30) =>
        RunAsync(userId => _careLogService.GetIncidentsAsync(userId, status, days), "lấy danh sách sự cố");

    /// <summary>
    /// Báo sự cố. IncidentType STROKE (nghi tái phát) / LOST (mất dấu cụ) là khẩn cấp.
    /// </summary>
    [HttpPost("incidents")]
    [ProducesResponseType(typeof(ApiResponse<IncidentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> CreateIncident([FromBody] CreateIncidentDto dto) =>
        RunAsync(userId => _careLogService.CreateIncidentAsync(userId, dto), "báo sự cố");

    /// <summary>
    /// Nhận xử lý (InProgress) hoặc đóng (Resolved + resolutionNotes) sự cố
    /// </summary>
    [HttpPatch("incidents/{incidentId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<IncidentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<IncidentDto>), StatusCodes.Status400BadRequest)]
    public Task<IActionResult> UpdateIncident(Guid incidentId, [FromBody] UpdateIncidentDto dto) =>
        RunAsync(userId => _careLogService.UpdateIncidentAsync(userId, incidentId, dto), "cập nhật sự cố");

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

    private async Task<IActionResult> RunAsync<T>(Func<Guid, Task<ApiResponse<T>>> action, string actionName)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(ApiResponse<T>.Fail("Không xác thực được người dùng. Vui lòng đăng nhập lại."));
            }

            var result = await action(userId.Value);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi {Action}: {Message}", actionName, ex.Message);
            return StatusCode(500, ApiResponse<T>.Fail($"Lỗi máy chủ khi {actionName}."));
        }
    }
}
