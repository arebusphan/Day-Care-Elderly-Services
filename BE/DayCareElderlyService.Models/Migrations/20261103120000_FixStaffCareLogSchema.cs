using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103120000_FixStaffCareLogSchema")]
public sealed class FixStaffCareLogSchema : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AttendanceRecords')
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckInAt')
                    ALTER TABLE AttendanceRecords ADD CheckInAt DATETIME2 NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckOutAt')
                    ALTER TABLE AttendanceRecords ADD CheckOutAt DATETIME2 NULL;
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckInTime')
                    EXEC('UPDATE AttendanceRecords SET CheckInAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''''00:00:00'''' AS time), CheckInTime), CAST(AttendanceDate AS datetime2)) WHERE CheckInAt IS NULL AND CheckInTime IS NOT NULL');
                IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AttendanceRecords' AND COLUMN_NAME = 'CheckOutTime')
                    EXEC('UPDATE AttendanceRecords SET CheckOutAt = DATEADD(SECOND, DATEDIFF(SECOND, CAST(''''00:00:00'''' AS time), CheckOutTime), CAST(AttendanceDate AS datetime2)) WHERE CheckOutAt IS NULL AND CheckOutTime IS NOT NULL');
            END;

            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'RecordedAt')
                BEGIN
                    ALTER TABLE CareLogs ADD RecordedAt DATETIME2(0) NULL;
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CreatedAt')
                        EXEC('UPDATE CareLogs SET RecordedAt = CreatedAt WHERE RecordedAt IS NULL');
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'CareDate')
                        EXEC('UPDATE CareLogs SET RecordedAt = CAST(CareDate AS datetime2) WHERE RecordedAt IS NULL');
                    EXEC('UPDATE CareLogs SET RecordedAt = SYSDATETIME() WHERE RecordedAt IS NULL');
                    ALTER TABLE CareLogs ALTER COLUMN RecordedAt DATETIME2(0) NOT NULL;
                END;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
                    ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;
                IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
                    ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
            END;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Keep synchronized columns and migrated legacy values to preserve existing records.
    }
}
