using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations
{
    /// <inheritdoc />
    public partial class RemoveStaffAndStaffLeave_AddStaffSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Tạo bảng StaffSchedules nếu chưa có
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffSchedules')
                BEGIN
                    CREATE TABLE StaffSchedules (
                        ScheduleId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_StaffSchedules_ScheduleId DEFAULT (NEWSEQUENTIALID()),
                        StaffId UNIQUEIDENTIFIER NOT NULL,
                        WorkDate DATE NOT NULL,
                        IsWorking BIT NOT NULL CONSTRAINT DF_StaffSchedules_IsWorking DEFAULT (1),
                        Note NVARCHAR(500) NULL,
                        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffSchedules_CreatedAt DEFAULT (SYSDATETIME()),
                        CONSTRAINT PK_StaffSchedules PRIMARY KEY (ScheduleId),
                        CONSTRAINT FK_StaffSchedules_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId) ON DELETE CASCADE,
                        CONSTRAINT UQ_StaffSchedules_Staff_Date UNIQUE (StaffId, WorkDate)
                    );
                    CREATE INDEX IX_StaffSchedules_StaffId ON StaffSchedules(StaffId);
                    CREATE INDEX IX_StaffSchedules_WorkDate ON StaffSchedules(WorkDate);
                END
            ");

            // 2. Dọn dẹp bảng StaffLeaves nếu còn tồn tại
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffLeaves')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffLeaves_Users')
                        ALTER TABLE StaffLeaves DROP CONSTRAINT FK_StaffLeaves_Users;
                    DROP TABLE StaffLeaves;
                END
            ");

            // 3. Dọn dẹp bảng StaffShifts nếu còn tồn tại
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffShifts')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffShifts_Staff')
                        ALTER TABLE StaffShifts DROP CONSTRAINT FK_StaffShifts_Staff;
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffShifts_Users_Staff')
                        ALTER TABLE StaffShifts DROP CONSTRAINT FK_StaffShifts_Users_Staff;
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffShifts_Users')
                        ALTER TABLE StaffShifts DROP CONSTRAINT FK_StaffShifts_Users;
                    DROP TABLE StaffShifts;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffSchedules')
                BEGIN
                    DROP TABLE StaffSchedules;
                END
            ");
        }
    }
}
