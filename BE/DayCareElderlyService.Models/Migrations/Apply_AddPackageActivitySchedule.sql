-- Apply_AddPackageActivitySchedule.sql
-- Lịch hoạt động theo gói (đối tượng bệnh) gắn vào care log — docs/thiet-ke-lich-hoat-dong-theo-goi.md
--   * PackageActivities: tên, mục đích, loại care log, phút mục tiêu, người làm, bệnh nền áp dụng, nguồn
--   * CareLogs.PackageActivityId: mục care log hoàn thành hoạt động nào trong lịch
--   * ElderlyMembers.ChronicConditions: mã bệnh nền (DIABETES, HYPERTENSION, HEART)
-- Chạy lặp lại an toàn (idempotent). BE tự chạy khi khởi động (OperationsSchema.EnsureAsync).
-- Lịch mẫu cho 5 gói được seed bằng code (PackageActivitySeeder), chỉ khi gói chưa có hoạt động.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- PackageActivities
IF COL_LENGTH(N'dbo.PackageActivities', N'ActivityName') IS NULL
    ALTER TABLE dbo.PackageActivities ADD ActivityName NVARCHAR(150) NOT NULL
        CONSTRAINT DF_PackageActivities_ActivityName DEFAULT N'';
IF COL_LENGTH(N'dbo.PackageActivities', N'Purpose') IS NULL
    ALTER TABLE dbo.PackageActivities ADD Purpose NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.PackageActivities', N'CareType') IS NULL
    ALTER TABLE dbo.PackageActivities ADD CareType NVARCHAR(30) NOT NULL
        CONSTRAINT DF_PackageActivities_CareType DEFAULT N'ACTIVITY';
IF COL_LENGTH(N'dbo.PackageActivities', N'TargetMinutes') IS NULL
    ALTER TABLE dbo.PackageActivities ADD TargetMinutes INT NULL;
IF COL_LENGTH(N'dbo.PackageActivities', N'PerformerRole') IS NULL
    ALTER TABLE dbo.PackageActivities ADD PerformerRole NVARCHAR(20) NOT NULL
        CONSTRAINT DF_PackageActivities_PerformerRole DEFAULT N'Any';
IF COL_LENGTH(N'dbo.PackageActivities', N'IsRequired') IS NULL
    ALTER TABLE dbo.PackageActivities ADD IsRequired BIT NOT NULL
        CONSTRAINT DF_PackageActivities_IsRequired DEFAULT 1;
IF COL_LENGTH(N'dbo.PackageActivities', N'ConditionCode') IS NULL
    ALTER TABLE dbo.PackageActivities ADD ConditionCode NVARCHAR(30) NULL;
IF COL_LENGTH(N'dbo.PackageActivities', N'Source') IS NULL
    ALTER TABLE dbo.PackageActivities ADD Source NVARCHAR(200) NULL;

-- CareLogs: gắn hoạt động trong lịch
IF COL_LENGTH(N'dbo.CareLogs', N'PackageActivityId') IS NULL
    ALTER TABLE dbo.CareLogs ADD PackageActivityId INT NULL;
IF OBJECT_ID(N'dbo.FK_CareLogs_PackageActivities', N'F') IS NULL
    ALTER TABLE dbo.CareLogs ADD CONSTRAINT FK_CareLogs_PackageActivities
        FOREIGN KEY (PackageActivityId) REFERENCES dbo.PackageActivities (PackageActivityId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_CareLogs_PackageActivityId')
    CREATE INDEX IX_CareLogs_PackageActivityId ON dbo.CareLogs (PackageActivityId);

-- ElderlyMembers: bệnh nền có mã
IF COL_LENGTH(N'dbo.ElderlyMembers', N'ChronicConditions') IS NULL
    ALTER TABLE dbo.ElderlyMembers ADD ChronicConditions NVARCHAR(200) NULL;

COMMIT TRANSACTION;
