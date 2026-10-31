-- ============================================================================
-- SCRIPT MIGRATION: BỎ BẢNG Staff, CHUYỂN SANG DÙNG User, TẠO BẢNG StaffLeaves
-- An toàn dữ liệu: Dữ liệu bảng Users và các bảng liên quan được bảo toàn hoàn toàn.
-- ============================================================================
USE [DayCareElderlyDB];
GO

-- 1. TẠO BẢNG StaffLeaves NẾU CHƯA TỒN TẠI
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffLeaves')
BEGIN
    CREATE TABLE StaffLeaves (
        LeaveId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_StaffLeaves_LeaveId DEFAULT (NEWSEQUENTIALID()),
        UserId UNIQUEIDENTIFIER NOT NULL,
        LeaveDate DATE NOT NULL,
        Reason NVARCHAR(500) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffLeaves_CreatedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_StaffLeaves PRIMARY KEY (LeaveId),
        CONSTRAINT FK_StaffLeaves_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
        CONSTRAINT UQ_StaffLeaves_User_Date UNIQUE (UserId, LeaveDate)
    );
    CREATE INDEX IX_StaffLeaves_UserId ON StaffLeaves(UserId);
    CREATE INDEX IX_StaffLeaves_LeaveDate ON StaffLeaves(LeaveDate);
    PRINT 'Da tao bang StaffLeaves thanh cong.';
END
GO

-- 2. ĐỒNG BỘ DỮ LIỆU TỪ BẢNG Staff SANG CÁC BẢNG LIÊN QUAN VÀ CHUYỂN FOREIGN KEY SANG Users
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Staff')
BEGIN
    -- 2.1. Bảng ActivityAssignments
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ActivityAssignments')
    BEGIN
        -- Gỡ foreign key cũ đến Staff nếu có
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ActivityAssignments_Staff')
        BEGIN
            ALTER TABLE ActivityAssignments DROP CONSTRAINT FK_ActivityAssignments_Staff;
        END

        -- Cập nhật StaffId hiện tại sang UserId tương ứng từ bảng Staff
        UPDATE a
        SET a.StaffId = s.UserId
        FROM ActivityAssignments a
        INNER JOIN Staff s ON a.StaffId = s.StaffId;

        -- Tạo foreign key mới đến Users(UserId) nếu chưa có
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ActivityAssignments_Users')
        BEGIN
            ALTER TABLE ActivityAssignments ADD CONSTRAINT FK_ActivityAssignments_Users
            FOREIGN KEY (StaffId) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK ActivityAssignments sang Users.';
        END
    END

    -- 2.2. Bảng AttendanceRecords
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AttendanceRecords')
    BEGIN
        -- Gỡ FK cũ
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AttendanceRecords_CheckedInBy')
            ALTER TABLE AttendanceRecords DROP CONSTRAINT FK_AttendanceRecords_CheckedInBy;
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AttendanceRecords_CheckedOutBy')
            ALTER TABLE AttendanceRecords DROP CONSTRAINT FK_AttendanceRecords_CheckedOutBy;

        -- Map CheckedInBy và CheckedOutBy sang UserId
        UPDATE a
        SET a.CheckedInBy = s.UserId
        FROM AttendanceRecords a
        INNER JOIN Staff s ON a.CheckedInBy = s.StaffId;

        UPDATE a
        SET a.CheckedOutBy = s.UserId
        FROM AttendanceRecords a
        INNER JOIN Staff s ON a.CheckedOutBy = s.StaffId;

        -- Tạo FK mới đến Users
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AttendanceRecords_CheckedInBy_Users')
        BEGIN
            ALTER TABLE AttendanceRecords ADD CONSTRAINT FK_AttendanceRecords_CheckedInBy_Users
            FOREIGN KEY (CheckedInBy) REFERENCES Users(UserId);
        END
        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_AttendanceRecords_CheckedOutBy_Users')
        BEGIN
            ALTER TABLE AttendanceRecords ADD CONSTRAINT FK_AttendanceRecords_CheckedOutBy_Users
            FOREIGN KEY (CheckedOutBy) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK AttendanceRecords sang Users.';
        END
    END

    -- 2.3. Bảng CareLogs
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
    BEGIN
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_CareLogs_Staff')
            ALTER TABLE CareLogs DROP CONSTRAINT FK_CareLogs_Staff;

        UPDATE c
        SET c.StaffId = s.UserId
        FROM CareLogs c
        INNER JOIN Staff s ON c.StaffId = s.StaffId;

        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_CareLogs_Users')
        BEGIN
            ALTER TABLE CareLogs ADD CONSTRAINT FK_CareLogs_Users
            FOREIGN KEY (StaffId) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK CareLogs sang Users.';
        END
    END

    -- 2.4. Bảng IncidentReports
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IncidentReports')
    BEGIN
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_IncidentReports_Staff')
            ALTER TABLE IncidentReports DROP CONSTRAINT FK_IncidentReports_Staff;

        UPDATE i
        SET i.ReportedBy = s.UserId
        FROM IncidentReports i
        INNER JOIN Staff s ON i.ReportedBy = s.StaffId;

        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_IncidentReports_Users')
        BEGIN
            ALTER TABLE IncidentReports ADD CONSTRAINT FK_IncidentReports_Users
            FOREIGN KEY (ReportedBy) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK IncidentReports sang Users.';
        END
    END

    -- 2.5. Bảng MedicationRecords
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicationRecords')
    BEGIN
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MedicationRecords_Staff')
            ALTER TABLE MedicationRecords DROP CONSTRAINT FK_MedicationRecords_Staff;

        UPDATE m
        SET m.StaffId = s.UserId
        FROM MedicationRecords m
        INNER JOIN Staff s ON m.StaffId = s.StaffId;

        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_MedicationRecords_Users')
        BEGIN
            ALTER TABLE MedicationRecords ADD CONSTRAINT FK_MedicationRecords_Users
            FOREIGN KEY (StaffId) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK MedicationRecords sang Users.';
        END
    END

    -- 2.6. Bảng StaffShifts
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffShifts')
    BEGIN
        IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffShifts_Staff')
            ALTER TABLE StaffShifts DROP CONSTRAINT FK_StaffShifts_Staff;

        UPDATE ss
        SET ss.StaffId = s.UserId
        FROM StaffShifts ss
        INNER JOIN Staff s ON ss.StaffId = s.StaffId;

        IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffShifts_Users_Staff')
        BEGIN
            ALTER TABLE StaffShifts ADD CONSTRAINT FK_StaffShifts_Users_Staff
            FOREIGN KEY (StaffId) REFERENCES Users(UserId);
            PRINT 'Da chuyen FK StaffShifts sang Users.';
        END
    END

    -- 2.7. Gỡ bỏ foreign key từ Staff đến Centers và Users nếu còn
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Staff_Centers')
        ALTER TABLE Staff DROP CONSTRAINT FK_Staff_Centers;

    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Staff_Users')
        ALTER TABLE Staff DROP CONSTRAINT FK_Staff_Users;

    -- 2.8. Xóa bảng Staff an toàn
    DROP TABLE Staff;
    PRINT 'Da xoa bang Staff an toan.';
END
GO
