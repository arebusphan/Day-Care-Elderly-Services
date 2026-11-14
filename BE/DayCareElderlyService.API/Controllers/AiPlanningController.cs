using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

/// <summary>
/// F-06: gợi ý phân ca (AI qua Claude API, ẩn danh BR-51; không có key thì theo luật).
/// Chỉ trả bản nháp (BR-50) — Manager áp dụng từng nhóm qua PUT .../groups/assign-staff.
/// </summary>
[ApiController]
[Route("api/center/planning")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class AiPlanningController : ControllerBase
{
    private readonly AiShiftSuggestionService _service;

    public AiPlanningController(AiShiftSuggestionService service)
    {
        _service = service;
    }

    [HttpPost("{planId:int}/ai-suggest")]
    [ProducesResponseType(typeof(ApiResponse<AiShiftSuggestionService.SuggestionResult>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Suggest(int planId, CancellationToken ct)
    {
        var result = await _service.SuggestAsync(planId, ct);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
