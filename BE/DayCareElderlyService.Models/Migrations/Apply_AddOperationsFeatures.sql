-- Apply_AddOperationsFeatures.sql
-- Bổ sung schema cho Đợt 2–4: sự cố chi tiết + trừ vật tư, hồ sơ nhân viên, người được đón,
-- báo vắng, đơn nghỉ / đổi ca. Chạy lặp lại an toàn (idempotent).
-- BE cũng tự chạy script này khi khởi động (OperationsSchema.EnsureAsync).
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- IncidentReports: người xử lý, các bước xử lý, chuyển viện, ảnh, phí vật tư
IF COL_LENGTH(N'dbo.IncidentReports', N'HandledBy') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HandledBy INT NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'HandlingActions') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HandlingActions NVARCHAR(2000) NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'HospitalName') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HospitalName NVARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'HospitalTransferAt') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HospitalTransferAt DATETIME2(0) NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'HospitalEscort') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HospitalEscort NVARCHAR(200) NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'PhotoUrls') IS NULL
    ALTER TABLE dbo.IncidentReports ADD PhotoUrls NVARCHAR(MAX) NULL;
IF COL_LENGTH(N'dbo.IncidentReports', N'SupplyChargeAmount') IS NULL
    ALTER TABLE dbo.IncidentReports ADD SupplyChargeAmount DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_IncidentReports_SupplyChargeAmount DEFAULT 0;
IF OBJECT_ID(N'dbo.FK_IncidentReports_HandledBy', N'F') IS NULL
    ALTER TABLE dbo.IncidentReports ADD CONSTRAINT FK_IncidentReports_HandledBy
        FOREIGN KEY (HandledBy) REFERENCES dbo.Users (UserId);

-- SupplyTransactions: gắn sự cố + đơn giá
IF COL_LENGTH(N'dbo.SupplyTransactions', N'IncidentId') IS NULL
    ALTER TABLE dbo.SupplyTransactions ADD IncidentId INT NULL;
IF COL_LENGTH(N'dbo.SupplyTransactions', N'UnitPrice') IS NULL
    ALTER TABLE dbo.SupplyTransactions ADD UnitPrice DECIMAL(18,2) NULL;
IF OBJECT_ID(N'dbo.FK_SupplyTransactions_IncidentReports', N'F') IS NULL
    ALTER TABLE dbo.SupplyTransactions ADD CONSTRAINT FK_SupplyTransactions_IncidentReports
        FOREIGN KEY (IncidentId) REFERENCES dbo.IncidentReports (IncidentId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SupplyTransactions_IncidentId')
    CREATE INDEX IX_SupplyTransactions_IncidentId ON dbo.SupplyTransactions (IncidentId);

-- MedicalSupplies: đơn giá, hạn dùng
IF COL_LENGTH(N'dbo.MedicalSupplies', N'UnitPrice') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD UnitPrice DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_MedicalSupplies_UnitPrice DEFAULT 0;
IF COL_LENGTH(N'dbo.MedicalSupplies', N'ExpiryDate') IS NULL
    ALTER TABLE dbo.MedicalSupplies ADD ExpiryDate DATE NULL;

-- AuthorizedPickupPersons (BR-30)
IF OBJECT_ID(N'dbo.AuthorizedPickupPersons', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuthorizedPickupPersons (
        PickupPersonId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthorizedPickupPersons PRIMARY KEY,
        ElderlyId INT NOT NULL,
        FullName NVARCHAR(150) NOT NULL,
        Relationship NVARCHAR(50) NULL,
        PhoneNumber NVARCHAR(20) NOT NULL,
        IdCardLast4 NVARCHAR(4) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_AuthorizedPickupPersons_IsActive DEFAULT 1,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthorizedPickupPersons_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_AuthorizedPickupPersons_Elderly FOREIGN KEY (ElderlyId)
            REFERENCES dbo.ElderlyMembers (ElderlyId) ON DELETE CASCADE
    );
    CREATE INDEX IX_AuthorizedPickupPersons_ElderlyId ON dbo.AuthorizedPickupPersons (ElderlyId);
END

-- AttendanceRecords: người đã đón
IF COL_LENGTH(N'dbo.AttendanceRecords', N'PickupPersonId') IS NULL
    ALTER TABLE dbo.AttendanceRecords ADD PickupPersonId INT NULL;
IF OBJECT_ID(N'dbo.FK_AttendanceRecords_PickupPerson', N'F') IS NULL
    ALTER TABLE dbo.AttendanceRecords ADD CONSTRAINT FK_AttendanceRecords_PickupPerson
        FOREIGN KEY (PickupPersonId) REFERENCES dbo.AuthorizedPickupPersons (PickupPersonId);

-- AbsenceReports (SR-32)
IF OBJECT_ID(N'dbo.AbsenceReports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AbsenceReports (
        AbsenceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AbsenceReports PRIMARY KEY,
        ElderlyId INT NOT NULL,
        AbsenceDate DATE NOT NULL,
        Reason NVARCHAR(500) NULL,
        ReportedBy INT NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AbsenceReports_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_AbsenceReports_Elderly FOREIGN KEY (ElderlyId)
            REFERENCES dbo.ElderlyMembers (ElderlyId) ON DELETE CASCADE,
        CONSTRAINT FK_AbsenceReports_Users FOREIGN KEY (ReportedBy) REFERENCES dbo.Users (UserId)
    );
    CREATE UNIQUE INDEX UQ_AbsenceReports_ElderlyDate ON dbo.AbsenceReports (ElderlyId, AbsenceDate);
END

-- StaffProfiles (F-04)
IF OBJECT_ID(N'dbo.StaffProfiles', N'U') IS NULL
    CREATE TABLE dbo.StaffProfiles (
        UserId INT NOT NULL CONSTRAINT PK_StaffProfiles PRIMARY KEY,
        Position NVARCHAR(100) NULL,
        Qualification NVARCHAR(300) NULL,
        StartDate DATE NULL,
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT FK_StaffProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId) ON DELETE CASCADE
    );

-- StaffRequests (SRS 3.10.2)
IF OBJECT_ID(N'dbo.StaffRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StaffRequests (
        RequestId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StaffRequests PRIMARY KEY,
        StaffId INT NOT NULL,
        RequestType NVARCHAR(20) NOT NULL,
        RequestDate DATE NOT NULL,
        SwapWithStaffId INT NULL,
        Reason NVARCHAR(500) NULL,
        Status NVARCHAR(20) NOT NULL CONSTRAINT DF_StaffRequests_Status DEFAULT N'Pending',
        ReviewedBy INT NULL,
        ReviewedAt DATETIME2(0) NULL,
        ReviewNote NVARCHAR(500) NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffRequests_CreatedAt DEFAULT SYSDATETIME(),
        CONSTRAINT FK_StaffRequests_Staff FOREIGN KEY (StaffId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_StaffRequests_SwapStaff FOREIGN KEY (SwapWithStaffId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_StaffRequests_Reviewer FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users (UserId)
    );
    CREATE INDEX IX_StaffRequests_StaffDate ON dbo.StaffRequests (StaffId, RequestDate);
END

COMMIT TRANSACTION;
