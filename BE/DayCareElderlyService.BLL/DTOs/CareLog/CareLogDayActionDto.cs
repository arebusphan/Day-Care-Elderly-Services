using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Xác nhận phần y tế xong (MEDICAL_DONE) hoặc chốt care log trong ngày (CLOSE) — CL-06.
/// </summary>
public class CareLogDayActionDto
{
    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }
}
