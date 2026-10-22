using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class ElderlyMember
{
    public Guid ElderlyId { get; set; }

    public Guid CenterId { get; set; }

    public string FullName { get; set; } = null!;

    public DateOnly? DateOfBirth { get; set; }

    public string? Gender { get; set; }

    public string? Address { get; set; }

    // Thông tin người liên hệ khẩn cấp
    public string? EmergencyContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    // Thông tin sức khỏe
    public string? Allergies { get; set; }

    public string? MedicalHistory { get; set; }

    public string? MedicalNotes { get; set; }

    // Thông tin chăm sóc & vận động
    public string? MobilityStatus { get; set; }

    public string? CareNotes { get; set; }

    public string? EmergencyNotes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<CareLog> CareLogs { get; set; } = new List<CareLog>();

    public virtual Center Center { get; set; } = null!;

    public virtual ICollection<ElderlyFamilyRelationship> ElderlyFamilyRelationships { get; set; } = new List<ElderlyFamilyRelationship>();

    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    public virtual ICollection<MedicationPlan> MedicationPlans { get; set; } = new List<MedicationPlan>();

    public virtual ICollection<ServiceRegistration> ServiceRegistrations { get; set; } = new List<ServiceRegistration>();
}
