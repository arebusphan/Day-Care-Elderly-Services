-- SCRIPT THÊM CỘT CHO BẢNG CareLogs (API care log)
USE [DayCareElderlyDB];
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
BEGIN
    -- 1. Chi tiết theo từng loại mục (JSON): số đo chỉ số, thuốc, % ăn...
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
    BEGIN
        ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;
        PRINT 'Da them cot Data';
    END

    -- 2. Mục nội bộ, gia đình không xem được
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
    BEGIN
        ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
        PRINT 'Da them cot IsInternal';
    END
END
GO
