using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Medication;

public class MedicationPlanDto
{
    public int MedicationPlanId { get; set; }
    public int ElderlyId { get; set; }
    public string ElderlyName { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    /// <summary>Suy ra từ MedicationRecords đã tạo (không lưu trên plan).</summary>
    public List<string> ScheduleTimes { get; set; } = new();
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int PendingDoseCount { get; set; }
}

public class CreateMedicationPlanDto
{
    [Required(ErrorMessage = "Vui lòng nhập tên thuốc.")]
    [StringLength(200, ErrorMessage = "Tên thuốc tối đa 200 ký tự.")]
    public string MedicationName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập liều dùng.")]
    [StringLength(100, ErrorMessage = "Liều dùng tối đa 100 ký tự.")]
    public string Dosage { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Hướng dẫn tối đa 1000 ký tự.")]
    public string? Instructions { get; set; }

    /// <summary>Giờ HH:mm — dùng sinh MedicationRecords.ScheduledAt, không thêm cột DB.</summary>
    [Required(ErrorMessage = "Vui lòng nhập ít nhất một giờ uống.")]
    [MinLength(1, ErrorMessage = "Vui lòng nhập ít nhất một giờ uống.")]
    public List<string> ScheduleTimes { get; set; } = new();

    [Required(ErrorMessage = "Vui lòng chọn ngày bắt đầu.")]
    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Số ngày tạo sẵn liều (mặc định 14, tối đa 60).</summary>
    public int? GenerateDays { get; set; }
}

public class UpdateMedicationPlanDto
{
    [Required(ErrorMessage = "Vui lòng nhập tên thuốc.")]
    [StringLength(200, ErrorMessage = "Tên thuốc tối đa 200 ký tự.")]
    public string MedicationName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập liều dùng.")]
    [StringLength(100, ErrorMessage = "Liều dùng tối đa 100 ký tự.")]
    public string Dosage { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Hướng dẫn tối đa 1000 ký tự.")]
    public string? Instructions { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn ngày bắt đầu.")]
    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Optional: nếu gửi thì sinh thêm liều Pending theo giờ này.</summary>
    public List<string>? ScheduleTimes { get; set; }
}

public class GenerateDosesDto
{
    [Required(ErrorMessage = "Vui lòng nhập ít nhất một giờ uống.")]
    [MinLength(1, ErrorMessage = "Vui lòng nhập ít nhất một giờ uống.")]
    public List<string> ScheduleTimes { get; set; } = new();

    public DateOnly? From { get; set; }

    public DateOnly? To { get; set; }
}

public class GenerateDosesResultDto
{
    public int MedicationPlanId { get; set; }
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public List<string> ScheduleTimes { get; set; } = new();
    public int CreatedCount { get; set; }
    public int SkippedExistingCount { get; set; }
}
