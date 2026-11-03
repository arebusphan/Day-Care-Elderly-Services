SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AttendanceRecords')
BEGIN
    IF COL_LENGTH('AttendanceRecords', 'CheckInAt') IS NULL
        ALTER TABLE AttendanceRecords ADD CheckInAt DATETIME2 NULL;
    IF COL_LENGTH('AttendanceRecords', 'CheckOutAt') IS NULL
        ALTER TABLE AttendanceRecords ADD CheckOutAt DATETIME2 NULL;

    IF COL_LENGTH('AttendanceRecords', 'CheckInTime') IS NOT NULL
        EXEC('UPDATE AttendanceRecords SET CheckInAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''00:00:00'' AS time), CheckInTime), CAST(AttendanceDate AS datetime2)) WHERE CheckInAt IS NULL AND CheckInTime IS NOT NULL');
    IF COL_LENGTH('AttendanceRecords', 'CheckOutTime') IS NOT NULL
        EXEC('UPDATE AttendanceRecords SET CheckOutAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''00:00:00'' AS time), CheckOutTime), CAST(AttendanceDate AS datetime2)) WHERE CheckOutAt IS NULL AND CheckOutTime IS NOT NULL');
END;

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
BEGIN
    IF COL_LENGTH('CareLogs', 'RecordedAt') IS NULL
    BEGIN
        ALTER TABLE CareLogs ADD RecordedAt DATETIME2(0) NULL;
        IF COL_LENGTH('CareLogs', 'CreatedAt') IS NOT NULL
            EXEC('UPDATE CareLogs SET RecordedAt = CreatedAt WHERE RecordedAt IS NULL');
        IF COL_LENGTH('CareLogs', 'CareDate') IS NOT NULL
            EXEC('UPDATE CareLogs SET RecordedAt = CAST(CareDate AS datetime2) WHERE RecordedAt IS NULL');
        EXEC('UPDATE CareLogs SET RecordedAt = SYSDATETIME() WHERE RecordedAt IS NULL');
        ALTER TABLE CareLogs ALTER COLUMN RecordedAt DATETIME2(0) NOT NULL;
    END;
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory')
BEGIN
    CREATE TABLE __EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory WHERE MigrationId = '20261103120000_FixStaffCareLogSchema')
    INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20261103120000_FixStaffCareLogSchema', '8.0.0');

COMMIT TRANSACTION;
