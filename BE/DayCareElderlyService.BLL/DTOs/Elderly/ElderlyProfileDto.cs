using System;

namespace DayCareElderlyService.BLL.DTOs.Elderly;

public class ElderlyProfileDto
{
    public Guid ElderlyId { get; set; }
    public Guid CenterId { get; set; }
    public string CenterName { get; set; } = string.Empty;

    // 1. Thông tin cá nhân
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string Relationship { get; set; } = string.Empty;
    public string EmergencyContactName { get; set; } = string.Empty;
    public string EmergencyContactPhone { get; set; } = string.Empty;

    // 2. Thông tin sức khỏe
    public string? Allergies { get; set; }
    public string? MedicalHistory { get; set; }
    public string? MedicalNotes { get; set; }

    // 3. Thông tin chăm sóc
    public string MobilityStatus { get; set; } = "Bình thường";
    public string? CareNotes { get; set; }

    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
