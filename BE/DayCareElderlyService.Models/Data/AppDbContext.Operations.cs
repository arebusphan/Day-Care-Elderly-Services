using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.Models.Data;

/// <summary>
/// Cấu hình EF cho các bảng / cột bổ sung (xem Entities/OperationsEntities.cs).
/// Tách file để không phải sửa AppDbContext.cs gốc.
/// </summary>
public partial class AppDbContext
{
    public virtual DbSet<StaffProfile> StaffProfiles { get; set; }
    public virtual DbSet<AuthorizedPickupPerson> AuthorizedPickupPersons { get; set; }
    public virtual DbSet<AbsenceReport> AbsenceReports { get; set; }
    public virtual DbSet<StaffRequest> StaffRequests { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<IncidentReport>(entity =>
        {
            entity.Property(e => e.HandlingActions).HasMaxLength(2000);
            entity.Property(e => e.HospitalName).HasMaxLength(200);
            entity.Property(e => e.HospitalTransferAt).HasPrecision(0);
            entity.Property(e => e.HospitalEscort).HasMaxLength(200);
            entity.Property(e => e.SupplyChargeAmount).HasColumnType("decimal(18, 2)").HasDefaultValue(0m);

            entity.HasOne(d => d.HandledByNavigation).WithMany()
                .HasForeignKey(d => d.HandledBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_IncidentReports_HandledBy");
        });

        modelBuilder.Entity<SupplyTransaction>(entity =>
        {
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");
            entity.HasIndex(e => e.IncidentId, "IX_SupplyTransactions_IncidentId");

            entity.HasOne(d => d.Incident).WithMany(p => p.SupplyTransactions)
                .HasForeignKey(d => d.IncidentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_SupplyTransactions_IncidentReports");
        });

        modelBuilder.Entity<MedicalSupply>(entity =>
        {
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)").HasDefaultValue(0m);
        });

        modelBuilder.Entity<AttendanceRecord>(entity =>
        {
            entity.HasOne(d => d.PickupPerson).WithMany()
                .HasForeignKey(d => d.PickupPersonId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AttendanceRecords_PickupPerson");
        });

        modelBuilder.Entity<StaffProfile>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.Position).HasMaxLength(100);
            entity.Property(e => e.Qualification).HasMaxLength(300);
            entity.Property(e => e.UpdatedAt).HasPrecision(0);

            entity.HasOne(d => d.User).WithOne()
                .HasForeignKey<StaffProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_StaffProfiles_Users");
        });

        modelBuilder.Entity<AuthorizedPickupPerson>(entity =>
        {
            entity.HasKey(e => e.PickupPersonId);
            entity.HasIndex(e => e.ElderlyId, "IX_AuthorizedPickupPersons_ElderlyId");
            entity.Property(e => e.FullName).HasMaxLength(150);
            entity.Property(e => e.Relationship).HasMaxLength(50);
            entity.Property(e => e.PhoneNumber).HasMaxLength(20);
            entity.Property(e => e.IdCardLast4).HasMaxLength(4);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Elderly).WithMany()
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_AuthorizedPickupPersons_Elderly");
        });

        modelBuilder.Entity<AbsenceReport>(entity =>
        {
            entity.HasKey(e => e.AbsenceId);
            entity.HasIndex(e => new { e.ElderlyId, e.AbsenceDate }, "UQ_AbsenceReports_ElderlyDate").IsUnique();
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Elderly).WithMany()
                .HasForeignKey(d => d.ElderlyId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_AbsenceReports_Elderly");
            entity.HasOne(d => d.ReportedByNavigation).WithMany()
                .HasForeignKey(d => d.ReportedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_AbsenceReports_Users");
        });

        modelBuilder.Entity<StaffRequest>(entity =>
        {
            entity.HasKey(e => e.RequestId);
            entity.HasIndex(e => new { e.StaffId, e.RequestDate }, "IX_StaffRequests_StaffDate");
            entity.Property(e => e.RequestType).HasMaxLength(20);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending");
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.ReviewNote).HasMaxLength(500);
            entity.Property(e => e.ReviewedAt).HasPrecision(0);
            entity.Property(e => e.CreatedAt).HasPrecision(0).HasDefaultValueSql("(sysdatetime())");

            entity.HasOne(d => d.Staff).WithMany()
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StaffRequests_Staff");
            entity.HasOne(d => d.SwapWithStaff).WithMany()
                .HasForeignKey(d => d.SwapWithStaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StaffRequests_SwapStaff");
            entity.HasOne(d => d.Reviewer).WithMany()
                .HasForeignKey(d => d.ReviewedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_StaffRequests_Reviewer");
        });
    }
}
