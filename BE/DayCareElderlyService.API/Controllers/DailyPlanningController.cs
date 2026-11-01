using System;
using System.Security.Claims;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.DailyPlanning;
using DayCareElderlyService.BLL.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DayCareElderlyService.API.Controllers;

[ApiController]
[Route("api/center/planning")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class DailyPlanningController : ControllerBase
{
    private readonly IDailyPlanningService _planningService;

    public DailyPlanningController(IDailyPlanningService planningService)
    {
        _planningService = planningService;
    }

    private int GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.FindFirst("nameid")?.Value;
        return int.TryParse(idStr, out var id) ? id : 0;
    }

    private static int GetDefaultCenterId() => 1;

    // ════════════════════════════════════════════════════════════════════
    // HISTORY — Lịch sử các kế hoạch hàng ngày của trung tâm
    // GET /api/center/planning/history
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("history")]
    public async Task<IActionResult> GetPlanHistory()
    {
        var result = await _planningService.GetPlanHistoryAsync(GetDefaultCenterId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // INIT — Khởi tạo plan cho ngày chỉ định
    // GET /api/center/planning/{date}
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("{date}")]
    public async Task<IActionResult> GetOrInitPlan(DateOnly date)
    {
        var result = await _planningService.GetOrInitPlanAsync(date, GetDefaultCenterId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 1: ATTENDANCE FORECAST
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("{planId:int}/attendance")]
    public async Task<IActionResult> GetAttendanceForecast(int planId)
    {
        var result = await _planningService.GetAttendanceForecastAsync(planId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("{planId:int}/attendance")]
    public async Task<IActionResult> UpdateAttendance(int planId, [FromBody] UpdateAttendanceDto dto)
    {
        var result = await _planningService.UpdateAttendanceAsync(planId, dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{planId:int}/attendance/bulk")]
    public async Task<IActionResult> BulkUpdateAttendance(int planId, [FromBody] BulkUpdateAttendanceDto dto)
    {
        var result = await _planningService.BulkUpdateAttendanceAsync(planId, dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 2: GROUP ARRANGEMENT
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("{planId:int}/groups")]
    public async Task<IActionResult> GetGroupArrangement(int planId)
    {
        var result = await _planningService.GetGroupArrangementAsync(planId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("{planId:int}/groups")]
    public async Task<IActionResult> CreateCareGroup(int planId, [FromBody] CreateCareGroupDto dto)
    {
        var result = await _planningService.CreateCareGroupAsync(planId, dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpDelete("{planId:int}/groups/{groupId:int}")]
    public async Task<IActionResult> DeleteCareGroup(int planId, int groupId)
    {
        var result = await _planningService.DeleteCareGroupAsync(planId, groupId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{planId:int}/groups/move")]
    public async Task<IActionResult> MoveElderlyToGroup(int planId, [FromBody] MoveElderlyToGroupDto dto)
    {
        var result = await _planningService.MoveElderlyToGroupAsync(planId, dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 3: STAFF AVAILABILITY
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("{date}/staff-availability")]
    public async Task<IActionResult> GetStaffAvailability(DateOnly date)
    {
        var result = await _planningService.GetStaffAvailabilityAsync(date, GetDefaultCenterId());
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("{date}/staff-availability")]
    public async Task<IActionResult> UpdateStaffAvailability(DateOnly date, [FromBody] UpdateStaffAvailabilityDto dto)
    {
        var result = await _planningService.UpdateStaffAvailabilityAsync(date, dto, GetDefaultCenterId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{date}/staff-availability/bulk")]
    public async Task<IActionResult> BulkUpdateStaffAvailability(DateOnly date, [FromBody] BulkUpdateStaffAvailabilityDto dto)
    {
        var result = await _planningService.BulkUpdateStaffAvailabilityAsync(date, dto, GetDefaultCenterId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 4: STAFF ASSIGNMENT
    // ════════════════════════════════════════════════════════════════════

    [HttpPost("{planId:int}/generate-assignment")]
    public async Task<IActionResult> GenerateAssignment(int planId)
    {
        var result = await _planningService.GenerateAssignmentAsync(planId, GetDefaultCenterId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("{planId:int}/groups/assign-staff")]
    public async Task<IActionResult> AssignStaffToGroup(int planId, [FromBody] AssignStaffToGroupDto dto)
    {
        var result = await _planningService.AssignStaffToGroupAsync(planId, dto);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 5: REVIEW & PUBLISH
    // ════════════════════════════════════════════════════════════════════

    [HttpGet("{planId:int}/summary")]
    public async Task<IActionResult> GetPlanSummary(int planId)
    {
        var result = await _planningService.GetPlanSummaryAsync(planId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("{planId:int}/publish")]
    public async Task<IActionResult> PublishPlan(int planId)
    {
        var userId = GetCurrentUserId();
        var result = await _planningService.PublishPlanAsync(planId, userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
