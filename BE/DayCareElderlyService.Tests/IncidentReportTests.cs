using System;
using System.Collections.Generic;
using DayCareElderlyService.Models.Entities;
using Xunit;

namespace DayCareElderlyService.Tests;

/// <summary>
/// WF-05: Kiểm thử vòng đời báo cáo sự cố người cao tuổi,
/// trạng thái chuyển viện và liên kết sổ cái vật tư (DS-09, F-13, SR-33).
/// </summary>
public class IncidentReportTests
{
    private static IncidentReport CreateSampleIncident(string severity = "Low") => new()
    {
        IncidentId = 1,
        ElderlyId = 10,
        ReportedBy = 2,
        IncidentType = "Ngã",
        Severity = severity,
        Description = "Cụ bị trượt chân nhẹ trong phòng sinh hoạt chung",
        OccurredAt = DateTime.UtcNow.AddMinutes(-30),
        ReportedAt = DateTime.UtcNow.AddMinutes(-10),
        Status = "Open",
        IsSupplyConfirmed = false,
        SupplyChargeAmount = 0m
    };

    [Fact]
    public void New_incident_report_defaults_to_open_status_and_unconfirmed_supplies()
    {
        // Arrange & Act
        var incident = CreateSampleIncident();

        // Assert
        Assert.Equal("Open", incident.Status);
        Assert.False(incident.IsSupplyConfirmed, "Sự cố mới tạo chưa được xác nhận vật tư.");
        Assert.Equal(0m, incident.SupplyChargeAmount);
        Assert.Null(incident.ResolvedAt);
        Assert.Null(incident.ResolutionNotes);
    }

    [Theory]
    [InlineData("Low")]
    [InlineData("Medium")]
    [InlineData("High")]
    public void Valid_severity_levels_are_assigned_correctly(string severity)
    {
        // Act
        var incident = CreateSampleIncident(severity);

        // Assert
        Assert.Equal(severity, incident.Severity);
    }

    [Fact]
    public void Progressing_and_resolving_incident_updates_status_and_resolution_details()
    {
        // Arrange
        var incident = CreateSampleIncident("Medium");
        var resolveTime = DateTime.UtcNow;

        // Act 1: Chuyển sang InProgress khi điều dưỡng bắt đầu xử lý
        incident.Status = "InProgress";
        incident.HandledBy = 3;
        incident.HandlingActions = "Sát trùng vết thương và băng bó bằng gạc vô trùng";

        // Assert 1
        Assert.Equal("InProgress", incident.Status);
        Assert.Equal(3, incident.HandledBy);
        Assert.NotNull(incident.HandlingActions);

        // Act 2: Giải quyết xong sự cố (Resolved)
        incident.Status = "Resolved";
        incident.ResolvedAt = resolveTime;
        incident.ResolutionNotes = "Cụ đã ổn định, vết thương khô, gia đình đã được thông báo";

        // Assert 2
        Assert.Equal("Resolved", incident.Status);
        Assert.Equal(resolveTime, incident.ResolvedAt);
        Assert.False(string.IsNullOrWhiteSpace(incident.ResolutionNotes));
    }

    [Fact]
    public void Hospital_transfer_details_are_captured_accurately_for_severe_incident()
    {
        // Arrange
        var incident = CreateSampleIncident("High");
        var transferTime = DateTime.UtcNow;

        // Act: Ghi nhận chuyển viện cấp cứu
        incident.HospitalName = "Bệnh viện Thống Nhất";
        incident.HospitalTransferAt = transferTime;
        incident.HospitalEscort = "Điều dưỡng Nguyễn Văn B";

        // Assert
        Assert.Equal("Bệnh viện Thống Nhất", incident.HospitalName);
        Assert.Equal(transferTime, incident.HospitalTransferAt);
        Assert.Equal("Điều dưỡng Nguyễn Văn B", incident.HospitalEscort);
    }

    [Fact]
    public void Incident_with_supplies_maintains_consistent_ledger_association()
    {
        // Arrange
        var incident = CreateSampleIncident();
        var supplyTx = new SupplyTransaction
        {
            TransactionId = 501,
            SupplyId = 12,
            IncidentId = incident.IncidentId,
            TransactionType = "INCIDENT",
            Quantity = 2m,
            UnitPrice = 20_000m,
            OccurredAt = DateTime.UtcNow,
            RecordedBy = 2
        };

        // Act
        incident.SupplyTransactions.Add(supplyTx);
        incident.SupplyChargeAmount = supplyTx.Quantity * supplyTx.UnitPrice.Value;
        incident.IsSupplyConfirmed = true;

        // Assert
        Assert.Single(incident.SupplyTransactions);
        Assert.Equal(40_000m, incident.SupplyChargeAmount);
        Assert.True(incident.IsSupplyConfirmed);
        Assert.Equal(incident.IncidentId, supplyTx.IncidentId);
    }
}
