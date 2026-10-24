using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.CareLog;

/// <summary>
/// Body cho "xong phần y tế" và "chốt care log"
/// </summary>
public class CareLogNoteDto
{
    [StringLength(1000, ErrorMessage = "Ghi chú tối đa 1000 ký tự.")]
    public string? Notes { get; set; }
}
