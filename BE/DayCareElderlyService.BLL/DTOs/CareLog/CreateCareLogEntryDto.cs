using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Ghi 1 mục care log: MEAL, HYGIENE, NAP, MOOD, ACTIVITY, NOTE
/// </summary>
public class CreateCareLogEntryDto
{
    [Required(ErrorMessage = "Vui lòng chọn loại mục care log.")]
    [StringLength(50)]
    public string CareType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Nội dung không được để trống.")]
    [StringLength(1000, ErrorMessage = "Nội dung tối đa 1000 ký tự.")]
    public string Description { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }

    /// <summary>Chi tiết tự do dạng JSON, ví dụ { "mealPercent": 80 }</summary>
    public JsonElement? Data { get; set; }

    /// <summary>true = mục nội bộ, gia đình không xem được</summary>
    public bool IsInternal { get; set; }

    /// <summary>Hoạt động hôm nay trong lịch (GET /api/staff/activities/today) mà mục này thuộc về, không bắt buộc</summary>
    public Guid? CenterActivityId { get; set; }
}
