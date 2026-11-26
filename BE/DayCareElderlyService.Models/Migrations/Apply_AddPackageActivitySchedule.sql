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
-- Older databases created this table with only PackageId, ActivityTemplateId and
-- DayOfWeek. Keep those databases compatible with the current PackageActivity model.
IF COL_LENGTH(N'dbo.PackageActivities', N'ActivityTemplateId') IS NULL
    ALTER TABLE dbo.PackageActivities ADD ActivityTemplateId INT NULL;
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'ActivityTemplateId'
      AND is_nullable = 0
)
BEGIN
    -- The legacy column may still have an FK to ActivityTemplates. The current
    -- model allows NULL and no longer uses that relationship, so remove that FK
    -- before relaxing the old NOT NULL column.
    DECLARE @packageActivityTemplateForeignKeys NVARCHAR(MAX) = N'';

    SELECT @packageActivityTemplateForeignKeys = @packageActivityTemplateForeignKeys
        + N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(parentTable.schema_id))
        + N'.' + QUOTENAME(parentTable.name)
        + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    INNER JOIN sys.tables parentTable ON parentTable.object_id = fk.parent_object_id
    WHERE fk.parent_object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND fkc.parent_column_id = COLUMNPROPERTY(
          OBJECT_ID(N'dbo.PackageActivities'), N'ActivityTemplateId', 'ColumnId');

    IF LEN(@packageActivityTemplateForeignKeys) > 0
        EXEC sys.sp_executesql @packageActivityTemplateForeignKeys;

    ALTER TABLE dbo.PackageActivities ALTER COLUMN ActivityTemplateId INT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'DayOfWeek') IS NULL
    ALTER TABLE dbo.PackageActivities ADD DayOfWeek TINYINT NULL;
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'DayOfWeek'
      AND (TYPE_NAME(user_type_id) <> N'tinyint' OR is_nullable = 0)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dbo.PackageActivities
        WHERE DayOfWeek IS NOT NULL
          AND (DayOfWeek < 0 OR DayOfWeek > 255)
    )
    BEGIN
        THROW 51000, 'PackageActivities.DayOfWeek contains values outside the TINYINT range.', 1;
    END;

    ALTER TABLE dbo.PackageActivities ALTER COLUMN DayOfWeek TINYINT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'StartTime') IS NULL
    ALTER TABLE dbo.PackageActivities ADD StartTime TIME(0) NOT NULL
        CONSTRAINT DF_PackageActivities_StartTime DEFAULT ('00:00');
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'StartTime'
      AND (is_nullable = 1 OR TYPE_NAME(user_type_id) <> N'time' OR scale <> 0)
)
BEGIN
    UPDATE dbo.PackageActivities SET StartTime = '00:00' WHERE StartTime IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN StartTime TIME(0) NOT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'EndTime') IS NULL
    ALTER TABLE dbo.PackageActivities ADD EndTime TIME(0) NOT NULL
        CONSTRAINT DF_PackageActivities_EndTime DEFAULT ('00:00');
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'EndTime'
      AND (is_nullable = 1 OR TYPE_NAME(user_type_id) <> N'time' OR scale <> 0)
)
BEGIN
    UPDATE dbo.PackageActivities SET EndTime = '00:00' WHERE EndTime IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN EndTime TIME(0) NOT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'DisplayOrder') IS NULL
    ALTER TABLE dbo.PackageActivities ADD DisplayOrder INT NOT NULL
        CONSTRAINT DF_PackageActivities_DisplayOrder DEFAULT (0);
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'DisplayOrder'
      AND (is_nullable = 1 OR TYPE_NAME(user_type_id) <> N'int')
)
BEGIN
    UPDATE dbo.PackageActivities SET DisplayOrder = 0 WHERE DisplayOrder IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN DisplayOrder INT NOT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'IsActive') IS NULL
    ALTER TABLE dbo.PackageActivities ADD IsActive BIT NOT NULL
        CONSTRAINT DF_PackageActivities_IsActive DEFAULT (1);
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'IsActive'
      AND (is_nullable = 1 OR TYPE_NAME(user_type_id) <> N'bit')
)
BEGIN
    UPDATE dbo.PackageActivities SET IsActive = 1 WHERE IsActive IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN IsActive BIT NOT NULL;
END;

IF COL_LENGTH(N'dbo.PackageActivities', N'ActivityName') IS NULL
    ALTER TABLE dbo.PackageActivities ADD ActivityName NVARCHAR(150) NOT NULL
        CONSTRAINT DF_PackageActivities_ActivityName DEFAULT N'';
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'ActivityName'
      AND is_nullable = 1
)
BEGIN
    UPDATE dbo.PackageActivities SET ActivityName = N'' WHERE ActivityName IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN ActivityName NVARCHAR(150) NOT NULL;
END;
IF COL_LENGTH(N'dbo.PackageActivities', N'Purpose') IS NULL
    ALTER TABLE dbo.PackageActivities ADD Purpose NVARCHAR(500) NULL;
IF COL_LENGTH(N'dbo.PackageActivities', N'CareType') IS NULL
    ALTER TABLE dbo.PackageActivities ADD CareType NVARCHAR(30) NOT NULL
        CONSTRAINT DF_PackageActivities_CareType DEFAULT N'ACTIVITY';
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'CareType'
      AND is_nullable = 1
)
BEGIN
    UPDATE dbo.PackageActivities SET CareType = N'ACTIVITY' WHERE CareType IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN CareType NVARCHAR(30) NOT NULL;
END;
IF COL_LENGTH(N'dbo.PackageActivities', N'TargetMinutes') IS NULL
    ALTER TABLE dbo.PackageActivities ADD TargetMinutes INT NULL;
IF COL_LENGTH(N'dbo.PackageActivities', N'PerformerRole') IS NULL
    ALTER TABLE dbo.PackageActivities ADD PerformerRole NVARCHAR(20) NOT NULL
        CONSTRAINT DF_PackageActivities_PerformerRole DEFAULT N'Any';
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'PerformerRole'
      AND is_nullable = 1
)
BEGIN
    UPDATE dbo.PackageActivities SET PerformerRole = N'Any' WHERE PerformerRole IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN PerformerRole NVARCHAR(20) NOT NULL;
END;
IF COL_LENGTH(N'dbo.PackageActivities', N'IsRequired') IS NULL
    ALTER TABLE dbo.PackageActivities ADD IsRequired BIT NOT NULL
        CONSTRAINT DF_PackageActivities_IsRequired DEFAULT 1;
ELSE IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
      AND name = N'IsRequired'
      AND (is_nullable = 1 OR TYPE_NAME(user_type_id) <> N'bit')
)
BEGIN
    UPDATE dbo.PackageActivities SET IsRequired = 1 WHERE IsRequired IS NULL;
    ALTER TABLE dbo.PackageActivities ALTER COLUMN IsRequired BIT NOT NULL;
END;
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
