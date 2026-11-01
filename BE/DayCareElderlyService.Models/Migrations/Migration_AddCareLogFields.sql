-- SCRIPT THÊM CỘT CHO BẢNG CareLogs VÀ BẢNG CareLogPhotos (API care log)
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

-- 3. Tạo bảng CareLogPhotos lưu trữ ảnh đính kèm của nhật ký chăm sóc
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogPhotos')
BEGIN
    CREATE TABLE CareLogPhotos (
        CareLogPhotoId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CareLogPhotos_CareLogPhotoId DEFAULT (NEWSEQUENTIALID()),
        CareLogId UNIQUEIDENTIFIER NOT NULL,
        FileUrl NVARCHAR(1000) NOT NULL,
        UploadedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogPhotos_UploadedAt DEFAULT (SYSDATETIME()),
        CONSTRAINT PK_CareLogPhotos PRIMARY KEY (CareLogPhotoId),
        CONSTRAINT FK_CareLogPhotos_CareLogs FOREIGN KEY (CareLogId) REFERENCES CareLogs(CareLogId) ON DELETE CASCADE
    );
    CREATE INDEX IX_CareLogPhotos_CareLogId ON CareLogPhotos(CareLogId);
    PRINT 'Da tao bang CareLogPhotos';
END
GO

