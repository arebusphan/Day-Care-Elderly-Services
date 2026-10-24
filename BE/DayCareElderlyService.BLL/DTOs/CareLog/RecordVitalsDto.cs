using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Một lần đo chỉ số. Nhập ít nhất 1 chỉ số.
/// </summary>
public class RecordVitalsDto
{
    [Range(40, 300, ErrorMessage = "Huyết áp tâm thu phải từ 40 đến 300 mmHg.")]
    public int? SystolicBp { get; set; }

    [Range(20, 200, ErrorMessage = "Huyết áp tâm trương phải từ 20 đến 200 mmHg.")]
    public int? DiastolicBp { get; set; }

    [Range(20, 250, ErrorMessage = "Nhịp tim phải từ 20 đến 250 lần/phút.")]
    public int? HeartRate { get; set; }

    [Range(50, 100, ErrorMessage = "SpO2 phải từ 50 đến 100%.")]
    public int? SpO2 { get; set; }

    [Range(30, 45, ErrorMessage = "Nhiệt độ phải từ 30 đến 45 °C.")]
    public decimal? Temperature { get; set; }

    /// <summary>Đường huyết (mmol/L)</summary>
    [Range(0.5, 40, ErrorMessage = "Đường huyết phải từ 0.5 đến 40 mmol/L.")]
    public decimal? BloodGlucose { get; set; }

    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }
}
