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
                    BEGIN
                        ALTER TABLE CareLogs ADD RecordedAt DATETIME2(0) NULL;
                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CreatedAt')
                            EXEC('UPDATE CareLogs SET RecordedAt = CreatedAt WHERE RecordedAt IS NULL');
                        IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CareDate')
                            EXEC('UPDATE CareLogs SET RecordedAt = CAST(CareDate AS datetime2) WHERE RecordedAt IS NULL');
                        UPDATE CareLogs SET RecordedAt = SYSDATETIME() WHERE RecordedAt IS NULL;
                        ALTER TABLE CareLogs ALTER COLUMN RecordedAt DATETIME2(0) NOT NULL;
                    END;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
                        ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
                        ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
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
