using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class Staff
{
    public Guid StaffId { get; set; }

    public Guid UserId { get; set; }

    public Guid CenterId { get; set; }

    public string EmployeeCode { get; set; } = null!;

    public string JobTitle { get; set; } = null!;

    public DateOnly? HireDate { get; set; }

    public string EmploymentStatus { get; set; } = null!;

    public virtual ICollection<ActivityAssignment> ActivityAssignments { get; set; } = new List<ActivityAssignment>();

    public virtual ICollection<AttendanceRecord> AttendanceRecordCheckedInByNavigations { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<AttendanceRecord> AttendanceRecordCheckedOutByNavigations { get; set; } = new List<AttendanceRecord>();

    public virtual ICollection<CareLog> CareLogs { get; set; } = new List<CareLog>();

    public virtual Center Center { get; set; } = null!;

    public virtual ICollection<IncidentReport> IncidentReports { get; set; } = new List<IncidentReport>();

    public virtual ICollection<MedicationRecord> MedicationRecords { get; set; } = new List<MedicationRecord>();

    public virtual ICollection<StaffShift> StaffShifts { get; set; } = new List<StaffShift>();

    public virtual User User { get; set; } = null!;
}
