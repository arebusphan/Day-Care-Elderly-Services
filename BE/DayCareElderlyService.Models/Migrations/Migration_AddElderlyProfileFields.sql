-- SCRIPT ĐỒNG BỘ CỘT BẢNG ElderlyMembers TRONG SQL SERVER
USE [DayCareElderlyDB];
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ElderlyMembers')
BEGIN
    -- 1. Thêm cột người liên hệ
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'EmergencyContactName')
    BEGIN
        ALTER TABLE ElderlyMembers ADD EmergencyContactName NVARCHAR(100) NULL;
        PRINT 'Da them cot EmergencyContactName';
    END

    -- 2. Thêm cột số điện thoại người liên hệ
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'EmergencyContactPhone')
    BEGIN
        ALTER TABLE ElderlyMembers ADD EmergencyContactPhone NVARCHAR(20) NULL;
        PRINT 'Da them cot EmergencyContactPhone';
    END

    -- 3. Thêm cột dị ứng
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'Allergies')
    BEGIN
        ALTER TABLE ElderlyMembers ADD Allergies NVARCHAR(1000) NULL;
        PRINT 'Da them cot Allergies';
    END

    -- 4. Thêm cột tiền sử bệnh lý
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'MedicalHistory')
    BEGIN
        ALTER TABLE ElderlyMembers ADD MedicalHistory NVARCHAR(1000) NULL;
        PRINT 'Da them cot MedicalHistory';
    END

    -- 5. Thêm cột khả năng di chuyển (Bình thường / Cần hỗ trợ)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'MobilityStatus')
    BEGIN
        ALTER TABLE ElderlyMembers ADD MobilityStatus NVARCHAR(50) NOT NULL CONSTRAINT DF_ElderlyMembers_MobilityStatus DEFAULT N'Bình thường';
        PRINT 'Da them cot MobilityStatus';
    END

    -- 6. Thêm cột ghi chú chăm sóc
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'CareNotes')
    BEGIN
        ALTER TABLE ElderlyMembers ADD CareNotes NVARCHAR(1000) NULL;
        PRINT 'Da them cot CareNotes';
    END

    -- 7. Nới lỏng CHECK constraint CK_ElderlyMembers_Gender để chấp nhận cả Male, Female, Nam, Nữ
    IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_ElderlyMembers_Gender')
    BEGIN
        ALTER TABLE ElderlyMembers DROP CONSTRAINT CK_ElderlyMembers_Gender;
        ALTER TABLE ElderlyMembers ADD CONSTRAINT CK_ElderlyMembers_Gender CHECK (Gender IN ('Male', 'Female', 'Other', N'Nam', N'Nữ', N'Khác'));
        PRINT 'Da cap nhat constraint CK_ElderlyMembers_Gender';
    END
END
GO
