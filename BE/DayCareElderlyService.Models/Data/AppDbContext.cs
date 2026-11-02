using System;
using System.Collections.Generic;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

public partial class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<ActivityAssignment> ActivityAssignments { get; set; }

    public virtual DbSet<ActivityTemplate> ActivityTemplates { get; set; }

    public virtual DbSet<AttendanceRecord> AttendanceRecords { get; set; }

    public virtual DbSet<CareLog> CareLogs { get; set; }

    public virtual DbSet<CareLogPhoto> CareLogPhotos { get; set; }

    public virtual DbSet<Center> Centers { get; set; }

    public virtual DbSet<CenterActivity> CenterActivities { get; set; }

    public virtual DbSet<DailySchedulePlan> DailySchedulePlans { get; set; }

    public virtual DbSet<ElderlyFamilyRelationship> ElderlyFamilyRelationships { get; set; }

    public virtual DbSet<ElderlyMember> ElderlyMembers { get; set; }

    public virtual DbSet<FamilyMember> FamilyMembers { get; set; }

    public virtual DbSet<IncidentReport> IncidentReports { get; set; }

    public virtual DbSet<MedicalSupply> MedicalSupplies { get; set; }

    public virtual DbSet<MedicationPlan> MedicationPlans { get; set; }

    public virtual DbSet<MedicationRecord> MedicationRecords { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<PackageActivity> PackageActivities { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<ServicePackage> ServicePackages { get; set; }

    public virtual DbSet<ServiceRegistration> ServiceRegistrations { get; set; }

    public virtual DbSet<StaffCareAssignment> StaffCareAssignments { get; set; }

    public virtual DbSet<DailyCareGroup> DailyCareGroups { get; set; }

    public virtual DbSet<CareGroupMember> CareGroupMembers { get; set; }

    public virtual DbSet<DailyAttendanceForecast> DailyAttendanceForecasts { get; set; }

    public virtual DbSet<StaffSchedule> StaffSchedules { get; set; }

    public virtual DbSet<SupplyTransaction> SupplyTransactions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ActivityAssignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId);

            entity.HasIndex(e => e.StaffId, "IX_ActivityAssignments_StaffId");

            entity.HasIndex(e => new { e.CenterActivityId, e.StaffId }, "UQ_ActivityAssignments_ActivityStaff").IsUnique();

            entity.Property(e => e.AssignmentId);
            entity.Property(e => e.AssignmentRole).HasMaxLength(100);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Assigned");

            entity.HasOne(d => d.CenterActivity).WithMany(p => p.ActivityAssignments)
                .HasForeignKey(d => d.CenterActivityId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ActivityAssignments_Activities");

            entity.HasOne(d => d.Staff).WithMany()
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ActivityAssignments_Users");
        });

        modelBuilder.Entity<ActivityTemplate>(entity =>
        {
            entity.Property(e => e.ActivityTemplateId);
            entity.Property(e => e.ActivityName).HasMaxLength(150);
            entity.Property(e => e.DefaultLocation).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.Center).WithMany(p => p.ActivityTemplates)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ActivityTemplates_Centers");
        });

        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasKey(e => e.AttendanceId);

            entity.HasIndex(e => e.AttendanceDate, "IX_AttendanceRecords_Date");

            entity.HasIndex(e => new { e.ElderlyId, e.AttendanceDate }, "UX_AttendanceRecords_Elderly_Date").IsUnique();

            entity.Property(e => e.AttendanceId);
            entity.Property(e => e.CheckInAt).HasPrecision(0);
            entity.Property(e => e.CheckOutAt).HasPrecision(0);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Notes).HasMaxLength(1000);

            entity.HasOne(d => d.CheckedInByNavigation).WithMany()
                .HasForeignKey(d => d.CheckedInBy)
                .HasConstraintName("FK_AttendanceRecords_CheckedInBy_Users");

            entity.HasOne(d => d.CheckedOutByNavigation).WithMany()
                .HasForeignKey(d => d.CheckedOutBy)
                .HasConstraintName("FK_AttendanceRecords_CheckedOutBy_Users");

            entity.HasOne(d => d.Elderly).WithMany(p => p.AttendanceRecords)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AttendanceRecords_Elderly");

            entity.HasOne(d => d.Registration).WithMany(p => p.AttendanceRecords)
                .HasForeignKey(d => d.RegistrationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AttendanceRecords_Registration");
        });

        modelBuilder.Entity<CareLog>(entity =>
        {
            entity.HasIndex(e => new { e.ElderlyId, e.RecordedAt }, "IX_CareLogs_ElderlyRecordedAt").IsDescending(false, true);

            entity.Property(e => e.CareLogId);
            entity.Property(e => e.CareType).HasMaxLength(50);
            entity.Property(e => e.RecordedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.CenterActivity).WithMany(p => p.CareLogs)
                .HasForeignKey(d => d.CenterActivityId)
                .HasConstraintName("FK_CareLogs_CenterActivities");

            entity.HasOne(d => d.Elderly).WithMany(p => p.CareLogs)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CareLogs_Elderly");

            entity.HasOne(d => d.Staff).WithMany()
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CareLogs_Users");
        });

        modelBuilder.Entity<CareLogPhoto>(entity =>
        {
            entity.Property(e => e.CareLogPhotoId);
            entity.Property(e => e.FileUrl).HasMaxLength(1000);
            entity.Property(e => e.UploadedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.CareLog).WithMany(p => p.CareLogPhotos)
                .HasForeignKey(d => d.CareLogId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CareLogPhotos_CareLogs");
        });

        modelBuilder.Entity<Center>(entity =>
        {
            entity.Property(e => e.CenterId);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.CenterName).HasMaxLength(200);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
        });

        modelBuilder.Entity<CenterActivity>(entity =>
        {
            entity.HasIndex(e => new { e.CenterId, e.ActivityDate }, "IX_CenterActivities_CenterDate");

            entity.Property(e => e.CenterActivityId);
            entity.Property(e => e.ActivityName).HasMaxLength(150);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.EndTime).HasPrecision(0);
            entity.Property(e => e.Location).HasMaxLength(200);
            entity.Property(e => e.StartTime).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Scheduled");

            entity.HasOne(d => d.Center).WithMany(p => p.CenterActivities)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CenterActivities_Centers");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.CenterActivities)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CenterActivities_Users");

            entity.HasOne(d => d.PackageActivity).WithMany(p => p.CenterActivities)
                .HasForeignKey(d => d.PackageActivityId)
                .HasConstraintName("FK_CenterActivities_PackageActivities");
        });

        modelBuilder.Entity<DailySchedulePlan>(entity =>
        {
            entity.HasKey(e => e.PlanId);

            entity.HasIndex(e => new { e.CenterId, e.PlanDate }, "UQ_DailySchedulePlans_Center_Date").IsUnique();

            entity.Property(e => e.PlanId);
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Draft");
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.ConfirmedAt).HasPrecision(0);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.Center).WithMany(p => p.DailySchedulePlans)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_DailySchedulePlans_Centers");

            entity.HasOne(d => d.ConfirmedByNavigation).WithMany()
                .HasForeignKey(d => d.ConfirmedBy)
                .HasConstraintName("FK_DailySchedulePlans_Users");
        });

        modelBuilder.Entity<DailyAttendanceForecast>(entity =>
        {
            entity.ToTable("DailyAttendanceForecasts");
            entity.HasKey(e => e.ForecastId);

            entity.HasIndex(e => new { e.PlanId, e.ElderlyId }, "UQ_DailyAttendanceForecast_Plan_Elderly").IsUnique();
            entity.HasIndex(e => e.PlanId, "IX_DailyAttendanceForecast_PlanId");

            entity.Property(e => e.AttendanceStatus).HasMaxLength(20).HasDefaultValue("Attending");
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.Plan).WithMany(p => p.AttendanceForecasts)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_DailyAttendanceForecast_Plans");

            entity.HasOne(d => d.Elderly).WithMany()
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_DailyAttendanceForecast_Elderly");
        });

        modelBuilder.Entity<DailyCareGroup>(entity =>
        {
            entity.HasKey(e => e.GroupId);

            entity.HasIndex(e => e.PlanId, "IX_DailyCareGroups_PlanId");
            entity.HasIndex(e => e.StaffId, "IX_DailyCareGroups_StaffId");

            entity.Property(e => e.GroupId);
            entity.Property(e => e.GroupName).HasMaxLength(100);
            entity.Property(e => e.GroupType).HasMaxLength(20).HasDefaultValue("Normal");
            entity.Property(e => e.MaxNormalCapacity).HasDefaultValue(10);
            entity.Property(e => e.MaxSupportCapacity).HasDefaultValue(4);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Plan).WithMany(p => p.CareGroups)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_DailyCareGroups_Plans");

            entity.HasOne(d => d.Staff).WithMany(p => p.DailyCareGroups)
                .HasForeignKey(d => d.StaffId)
                .HasConstraintName("FK_DailyCareGroups_Users");
        });

        modelBuilder.Entity<CareGroupMember>(entity =>
        {
            entity.HasKey(e => e.GroupMemberId);

            entity.HasIndex(e => new { e.GroupId, e.ElderlyId }, "UQ_CareGroupMembers_Group_Elderly").IsUnique();
            entity.HasIndex(e => e.GroupId, "IX_CareGroupMembers_GroupId");
            entity.HasIndex(e => e.ElderlyId, "IX_CareGroupMembers_ElderlyId");

            entity.Property(e => e.GroupMemberId);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.AssignedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Group).WithMany(p => p.Members)
                .HasForeignKey(d => d.GroupId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_CareGroupMembers_Groups");

            entity.HasOne(d => d.Elderly).WithMany(p => p.CareGroupMembers)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CareGroupMembers_Elderly");
        });

        modelBuilder.Entity<ElderlyFamilyRelationship>(entity =>
        {
            entity.HasKey(e => new { e.ElderlyId, e.FamilyMemberId });

            entity.Property(e => e.CanReceiveNotifications).HasDefaultValue(true);
            entity.Property(e => e.CanViewCareLogs).HasDefaultValue(true);
            entity.Property(e => e.Relationship).HasMaxLength(50);

            entity.HasOne(d => d.Elderly).WithMany(p => p.ElderlyFamilyRelationships)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_EFR_ElderlyMembers");

            entity.HasOne(d => d.FamilyMember).WithMany(p => p.ElderlyFamilyRelationships)
                .HasForeignKey(d => d.FamilyMemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_EFR_FamilyMembers");
        });

        modelBuilder.Entity<ElderlyMember>(entity =>
        {
            entity.HasKey(e => e.ElderlyId);

            entity.HasIndex(e => e.CenterId, "IX_ElderlyMembers_CenterId");

            entity.Property(e => e.ElderlyId);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.Gender).HasMaxLength(20);
            entity.Property(e => e.EmergencyContactName).HasMaxLength(100);
            entity.Property(e => e.EmergencyContactPhone).HasMaxLength(20);
            entity.Property(e => e.Allergies).HasMaxLength(1000);
            entity.Property(e => e.MedicalHistory).HasMaxLength(1000);
            entity.Property(e => e.MobilityStatus).HasMaxLength(50).HasDefaultValue("Bình thường");
            entity.Property(e => e.CareNotes).HasMaxLength(1000);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.Center).WithMany(p => p.ElderlyMembers)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ElderlyMembers_Centers");
        });

        modelBuilder.Entity<FamilyMember>(entity =>
        {
            entity.HasIndex(e => e.UserId, "UQ_FamilyMembers_UserId").IsUnique();

            entity.Property(e => e.FamilyMemberId);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.EmergencyContact).HasMaxLength(20);

            entity.HasOne(d => d.User).WithOne(p => p.FamilyMember)
                .HasForeignKey<FamilyMember>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_FamilyMembers_Users");
        });

        modelBuilder.Entity<IncidentReport>(entity =>
        {
            entity.HasKey(e => e.IncidentId);

            entity.HasIndex(e => new { e.CenterId, e.Status }, "IX_IncidentReports_CenterStatus");

            entity.Property(e => e.IncidentId);
            entity.Property(e => e.IncidentType).HasMaxLength(100);
            entity.Property(e => e.OccurredAt).HasPrecision(0);
            entity.Property(e => e.ReportedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.ResolvedAt).HasPrecision(0);
            entity.Property(e => e.Severity).HasMaxLength(30);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Open");
            entity.Property(e => e.IsSupplyConfirmed).HasDefaultValue(false);

            entity.HasOne(d => d.Center).WithMany(p => p.IncidentReports)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IncidentReports_Centers");

            entity.HasOne(d => d.Elderly).WithMany(p => p.IncidentReports)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IncidentReports_Elderly");

            entity.HasOne(d => d.ReportedByNavigation).WithMany()
                .HasForeignKey(d => d.ReportedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IncidentReports_Users");
        });

        modelBuilder.Entity<MedicalSupply>(entity =>
        {
            entity.HasKey(e => e.SupplyId);

            entity.Property(e => e.SupplyId);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MinimumStock).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.QuantityInStock).HasColumnType("decimal(18, 2)").HasDefaultValue(0m);
            entity.Property(e => e.SupplyName).HasMaxLength(200);
            entity.Property(e => e.Unit).HasMaxLength(50);

            entity.HasOne(d => d.Center).WithMany(p => p.MedicalSupplies)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MedicalSupplies_Centers");
        });

        modelBuilder.Entity<MedicationPlan>(entity =>
        {
            entity.Property(e => e.MedicationPlanId);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Dosage).HasMaxLength(100);
            entity.Property(e => e.Instructions).HasMaxLength(1000);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MedicationName).HasMaxLength(200);

            entity.HasOne(d => d.Elderly).WithMany(p => p.MedicationPlans)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MedicationPlans_Elderly");
        });

        modelBuilder.Entity<MedicationRecord>(entity =>
        {
            entity.HasIndex(e => new { e.MedicationPlanId, e.ScheduledAt }, "IX_MedicationRecords_PlanScheduledAt");

            entity.Property(e => e.MedicationRecordId);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.RecordedAt).HasPrecision(0);
            entity.Property(e => e.ScheduledAt).HasPrecision(0);
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");

            entity.HasOne(d => d.MedicationPlan).WithMany(p => p.MedicationRecords)
                .HasForeignKey(d => d.MedicationPlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MedicationRecords_Plans");

            entity.HasOne(d => d.Staff).WithMany()
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MedicationRecords_Users");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.IsRead, e.CreatedAt }, "IX_Notifications_UserReadCreated").IsDescending(false, false, true);

            entity.Property(e => e.NotificationId);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.NotificationType).HasMaxLength(50);
            entity.Property(e => e.RelatedEntityType).HasMaxLength(100);
            entity.Property(e => e.Title).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Notifications_Users");
        });

        modelBuilder.Entity<PackageActivity>(entity =>
        {
            entity.Property(e => e.PackageActivityId);
            entity.Property(e => e.EndTime).HasPrecision(0);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.StartTime).HasPrecision(0);

            entity.HasOne(d => d.ActivityTemplate).WithMany(p => p.PackageActivities)
                .HasForeignKey(d => d.ActivityTemplateId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageActivities_Templates");

            entity.HasOne(d => d.Package).WithMany(p => p.PackageActivities)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageActivities_Packages");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasIndex(e => e.RegistrationId, "IX_Payments_RegistrationId");

            entity.Property(e => e.PaymentId);
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.PaidAt).HasPrecision(0);
            entity.Property(e => e.PaymentMethod).HasMaxLength(100);
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");
            entity.Property(e => e.TransactionReference).HasMaxLength(200);
            entity.Property(e => e.InvoiceNo).HasMaxLength(50);
            entity.Property(e => e.InvoiceVatNo).HasMaxLength(50);

            entity.HasOne(d => d.Registration).WithMany(p => p.Payments)
                .HasForeignKey(d => d.RegistrationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payments_ServiceRegistrations");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(e => e.RoleName, "UQ_Roles_RoleName").IsUnique();

            entity.Property(e => e.Description).HasMaxLength(255);
            entity.Property(e => e.RoleName).HasMaxLength(50);
        });

        modelBuilder.Entity<ServicePackage>(entity =>
        {
            entity.HasKey(e => e.PackageId);

            entity.HasIndex(e => e.CenterId, "IX_ServicePackages_CenterId");

            entity.Property(e => e.PackageId);
            entity.Property(e => e.BillingPeriod).HasMaxLength(30);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PackageName).HasMaxLength(100);
            entity.Property(e => e.Price).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PricePerDay).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PriceMonth3Days).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.PriceMonthFullWeek).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Highlights).HasMaxLength(2000);
            entity.Property(e => e.IncludedServices).HasMaxLength(2000);
            entity.Property(e => e.TargetAudience).HasMaxLength(500);
            entity.Property(e => e.PricingNote).HasMaxLength(500);

            entity.HasOne(d => d.Center).WithMany(p => p.ServicePackages)
                .HasForeignKey(d => d.CenterId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ServicePackages_Centers");
        });

        modelBuilder.Entity<ServiceRegistration>(entity =>
        {
            entity.HasKey(e => e.RegistrationId);

            entity.HasIndex(e => e.ElderlyId, "IX_ServiceRegistrations_ElderlyId");

            entity.HasIndex(e => e.PackageId, "IX_ServiceRegistrations_PackageId");

            entity.Property(e => e.RegistrationId);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.PriceAtPurchase).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValue("Pending");
            entity.Property(e => e.RegistrationCode).HasMaxLength(50);
            entity.Property(e => e.RegistrationType).HasMaxLength(30);
            entity.Property(e => e.MonthlyPattern).HasMaxLength(30);
            entity.Property(e => e.RoomType).HasMaxLength(30);
            entity.Property(e => e.SupportSurcharge).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.RoomSurcharge).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.SelectedDatesJson).HasMaxLength(4000);

            entity.HasOne(d => d.Elderly).WithMany(p => p.ServiceRegistrations)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ServiceRegistrations_Elderly");

            entity.HasOne(d => d.Package).WithMany(p => p.ServiceRegistrations)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ServiceRegistrations_Package");
        });

        modelBuilder.Entity<StaffCareAssignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId);

            entity.HasIndex(e => new { e.PlanId, e.ElderlyId }, "UQ_StaffCareAssignments_Plan_Elderly").IsUnique();
            entity.HasIndex(e => new { e.PlanId, e.StaffId }, "IX_StaffCareAssignments_Plan_Staff");

            entity.Property(e => e.AssignmentId);
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Plan).WithMany(p => p.Assignments)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_StaffCareAssignments_Plans");

            entity.HasOne(d => d.Staff).WithMany(p => p.StaffCareAssignments)
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StaffCareAssignments_Users");

            entity.HasOne(d => d.Elderly).WithMany(p => p.StaffCareAssignments)
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StaffCareAssignments_Elderly");
        });

        modelBuilder.Entity<StaffSchedule>(entity =>
        {
            entity.HasKey(e => e.ScheduleId);

            entity.HasIndex(e => new { e.StaffId, e.WorkDate }, "UQ_StaffSchedules_Staff_Date").IsUnique();

            entity.HasIndex(e => e.StaffId, "IX_StaffSchedules_StaffId");

            entity.HasIndex(e => e.WorkDate, "IX_StaffSchedules_WorkDate");

            entity.Property(e => e.ScheduleId);
            entity.Property(e => e.IsWorking).HasDefaultValue(true);
            entity.Property(e => e.Availability).HasMaxLength(20).HasDefaultValue("Working");
            entity.Property(e => e.Note).HasMaxLength(500);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Staff).WithMany(p => p.StaffSchedules)
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_StaffSchedules_Users");
        });

        modelBuilder.Entity<SupplyTransaction>(entity =>
        {
            entity.HasIndex(e => new { e.SupplyId, e.OccurredAt }, "IX_SupplyTransactions_SupplyOccurredAt").IsDescending(false, true);

            entity.Property(e => e.SupplyTransactionId);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.Property(e => e.OccurredAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.TransactionType).HasMaxLength(30);

            entity.HasOne(d => d.RecordedByNavigation).WithMany(p => p.SupplyTransactions)
                .HasForeignKey(d => d.RecordedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SupplyTransactions_Users");

            entity.HasOne(d => d.Supply).WithMany(p => p.SupplyTransactions)
                .HasForeignKey(d => d.SupplyId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SupplyTransactions_Supplies");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email, "UQ_Users_Email").IsUnique();

            entity.Property(e => e.UserId);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(0)
                .HasDefaultValueSql("(sysdatetime())");
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PasswordHash).HasMaxLength(500);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasMany(d => d.Roles).WithMany(p => p.Users)
                .UsingEntity<Dictionary<string, object>>(
                    "UserRole",
                    r => r.HasOne<Role>().WithMany()
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_UserRoles_Roles"),
                    l => l.HasOne<User>().WithMany()
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_UserRoles_Users"),
                    j =>
                    {
                        j.HasKey("UserId", "RoleId");
                        j.ToTable("UserRoles");
                    });
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
