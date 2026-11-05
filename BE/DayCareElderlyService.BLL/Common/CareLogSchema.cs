using DayCareElderlyService.Models.Data;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Đảm bảo schema điểm danh và care log tương thích với model hiện tại trên cả DB cũ.
/// </summary>
public static class CareLogSchema
{
    private static bool _columnsChecked;
    private static readonly SemaphoreSlim SchemaLock = new(1, 1);

    public static async Task EnsureColumnsAsync(AppDbContext context)
    {
        if (_columnsChecked) return;

        await SchemaLock.WaitAsync();
        try
        {
            if (_columnsChecked) return;

            var syncColumnsSql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AttendanceRecords')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckInAt')
                        ALTER TABLE AttendanceRecords ADD CheckInAt DATETIME2 NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckOutAt')
                        ALTER TABLE AttendanceRecords ADD CheckOutAt DATETIME2 NULL;

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckInTime')
                        EXEC('UPDATE AttendanceRecords SET CheckInAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''00:00:00'' AS time), CheckInTime), CAST(AttendanceDate AS datetime2)) WHERE CheckInAt IS NULL AND CheckInTime IS NOT NULL');

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckOutTime')
                        EXEC('UPDATE AttendanceRecords SET CheckOutAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''00:00:00'' AS time), CheckOutTime), CAST(AttendanceDate AS datetime2)) WHERE CheckOutAt IS NULL AND CheckOutTime IS NOT NULL');
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'RecordedAt')
                        ALTER TABLE CareLogs ADD RecordedAt DATETIME2(0) NULL;

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CreatedAt')
                        EXEC('UPDATE CareLogs SET RecordedAt = CreatedAt WHERE RecordedAt IS NULL');
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CareDate')
                        EXEC('UPDATE CareLogs SET RecordedAt = CAST(CareDate AS datetime2) WHERE RecordedAt IS NULL');
                    EXEC('UPDATE CareLogs SET RecordedAt = SYSDATETIME() WHERE RecordedAt IS NULL');
                    EXEC('ALTER TABLE CareLogs ALTER COLUMN RecordedAt DATETIME2(0) NOT NULL');

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Description')
                    BEGIN
                        UPDATE CareLogs SET Description = N'' WHERE Description IS NULL;
                        ALTER TABLE CareLogs ALTER COLUMN Description NVARCHAR(MAX) NOT NULL;
                    END;

                    IF COL_LENGTH('dbo.CareLogs', 'CareDate') IS NOT NULL
                       AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.CareLogs') AND name = 'CareDate' AND is_nullable = 0)
                        EXEC('ALTER TABLE dbo.CareLogs ALTER COLUMN CareDate DATE NULL');

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
                        ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
                        ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
                END

                -- Older databases store medication date/time separately. The current EF model
                -- reads ScheduledAt and RecordedAt, so add and backfill those columns safely.
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicationPlans')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationPlans' AND COLUMN_NAME = 'ScheduleTimes')
                        ALTER TABLE MedicationPlans ADD ScheduleTimes NVARCHAR(200) NULL;
                    EXEC('UPDATE MedicationPlans SET ScheduleTimes = N''08:00'' WHERE ScheduleTimes IS NULL OR LTRIM(RTRIM(ScheduleTimes)) = N''''');
                    EXEC('ALTER TABLE MedicationPlans ALTER COLUMN ScheduleTimes NVARCHAR(200) NOT NULL');
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicationRecords')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'ScheduledAt')
                    BEGIN
                        ALTER TABLE MedicationRecords ADD ScheduledAt DATETIME2(0) NULL;

                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'AdministeredDate')
                           AND EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'AdministeredTime')
                            EXEC('UPDATE MedicationRecords SET ScheduledAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''00:00:00'' AS time), AdministeredTime), CAST(AdministeredDate AS datetime2)) WHERE ScheduledAt IS NULL');

                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'CreatedAt')
                            EXEC('UPDATE MedicationRecords SET ScheduledAt = CreatedAt WHERE ScheduledAt IS NULL');

                        EXEC('UPDATE MedicationRecords SET ScheduledAt = SYSDATETIME() WHERE ScheduledAt IS NULL');
                        EXEC('ALTER TABLE MedicationRecords ALTER COLUMN ScheduledAt DATETIME2(0) NOT NULL');
                    END;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'RecordedAt')
                    BEGIN
                        ALTER TABLE MedicationRecords ADD RecordedAt DATETIME2(0) NULL;
                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicationRecords' AND COLUMN_NAME = 'CreatedAt')
                            EXEC('UPDATE MedicationRecords SET RecordedAt = CreatedAt WHERE RecordedAt IS NULL');
                    END;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IncidentReports')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IncidentType')
                        ALTER TABLE IncidentReports ADD IncidentType NVARCHAR(100) NULL;
                    EXEC('UPDATE IncidentReports SET IncidentType = N''OTHER'' WHERE IncidentType IS NULL');
                    EXEC('ALTER TABLE IncidentReports ALTER COLUMN IncidentType NVARCHAR(100) NOT NULL');

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'OccurredAt')
                        ALTER TABLE IncidentReports ADD OccurredAt DATETIME2(0) NULL;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IncidentDate')
                        EXEC('UPDATE IncidentReports SET OccurredAt = IncidentDate WHERE OccurredAt IS NULL');
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'CreatedAt')
                        EXEC('UPDATE IncidentReports SET OccurredAt = CreatedAt WHERE OccurredAt IS NULL');
                    EXEC('UPDATE IncidentReports SET OccurredAt = SYSDATETIME() WHERE OccurredAt IS NULL');
                    EXEC('ALTER TABLE IncidentReports ALTER COLUMN OccurredAt DATETIME2(0) NOT NULL');

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ReportedAt')
                        ALTER TABLE IncidentReports ADD ReportedAt DATETIME2(0) NULL;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'CreatedAt')
                        EXEC('UPDATE IncidentReports SET ReportedAt = CreatedAt WHERE ReportedAt IS NULL');
                    EXEC('UPDATE IncidentReports SET ReportedAt = OccurredAt WHERE ReportedAt IS NULL');
                    EXEC('ALTER TABLE IncidentReports ALTER COLUMN ReportedAt DATETIME2(0) NOT NULL');

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ResolutionNotes')
                        ALTER TABLE IncidentReports ADD ResolutionNotes NVARCHAR(1000) NULL;
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ActionTaken')
                        EXEC('UPDATE IncidentReports SET ResolutionNotes = ActionTaken WHERE ResolutionNotes IS NULL');

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ResolvedAt')
                        ALTER TABLE IncidentReports ADD ResolvedAt DATETIME2(0) NULL;
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IsSupplyConfirmed')
                        ALTER TABLE IncidentReports ADD IsSupplyConfirmed BIT NOT NULL CONSTRAINT DF_IncidentReports_IsSupplyConfirmed DEFAULT 0;
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncColumnsSql);
            _columnsChecked = true;
        }
        finally
        {
            SchemaLock.Release();
        }
    }
}
