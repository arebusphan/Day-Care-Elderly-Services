-- ===================================================================================
-- TRUNG TÂM DƯỠNG LÃO BAN NGÀY (DAY-CARE ELDERLY SERVICE MANAGEMENT PLATFORM)
-- FILE SQL TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU VÀ SEED DỮ LIỆU THỰC TẾ FULL 100%
-- Cơ sở dữ liệu: DayCareElderlyDB
-- Hệ quản trị CSDL: Microsoft SQL Server (2019 / 2022 / Express / LocalDB)
-- ===================================================================================

-- 1. TẠO CƠ SỞ DỮ LIỆU NẾU CHƯA CÓ
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = N'DayCareElderlyDB')
BEGIN
    CREATE DATABASE DayCareElderlyDB COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT N'-> Đã tạo database DayCareElderlyDB thành công.';
END
GO

USE DayCareElderlyDB;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

PRINT N'--- Đang chuẩn bị cấu trúc bảng (Schema) ---';

-- 2. XÓA TOÀN BỘ KHÓA NGOẠI CŨ ĐỂ TÁI LẬP SẠCH BẢNG
DECLARE @sqlDropFk NVARCHAR(MAX) = N'';
SELECT @sqlDropFk += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
                     N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
FROM sys.foreign_keys;
IF @sqlDropFk <> N'' EXEC sp_executesql @sqlDropFk;
GO

-- 3. XÓA TOÀN BỘ CÁC BẢNG CŨ (NẾU ĐÃ TỒN TẠI)
DECLARE @sqlDropTables NVARCHAR(MAX) = N'';
SELECT @sqlDropTables += N'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + N'.' + QUOTENAME(TABLE_NAME) + N';' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '__EFMigrationsHistory';
IF @sqlDropTables <> N'' EXEC sp_executesql @sqlDropTables;
GO

-- ===================================================================================
-- 4. TẠO CÁC BẢNG HỆ THỐNG
-- ===================================================================================

-- 4.1 Bảng Roles
CREATE TABLE dbo.Roles (
    RoleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL CONSTRAINT UQ_Roles_RoleName UNIQUE,
    Description NVARCHAR(255) NULL
);

-- 4.2 Bảng Users
CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Email NVARCHAR(100) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(0) NULL
);

-- 4.3 Bảng UserRoles
CREATE TABLE dbo.UserRoles (
    UserId INT NOT NULL,
    RoleId INT NOT NULL,
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE
);

-- 4.4 Bảng Centers (Trung tâm)
CREATE TABLE dbo.Centers (
    CenterId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Centers PRIMARY KEY,
    CenterName NVARCHAR(150) NOT NULL,
    Address NVARCHAR(255) NULL,
    PhoneNumber NVARCHAR(20) NULL,
    Email NVARCHAR(100) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Centers_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Centers_CreatedAt DEFAULT SYSDATETIME()
);

-- 4.5 Bảng FamilyMembers (Thân nhân người cao tuổi)
CREATE TABLE dbo.FamilyMembers (
    FamilyMemberId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_FamilyMembers PRIMARY KEY,
    UserId INT NOT NULL CONSTRAINT UQ_FamilyMembers_UserId UNIQUE,
    Address NVARCHAR(255) NULL,
    EmergencyContact NVARCHAR(100) NULL,
    RelationshipToElderly NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_FamilyMembers_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_FamilyMembers_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);

-- 4.6 Bảng ElderlyMembers (Hồ sơ người cao tuổi)
CREATE TABLE dbo.ElderlyMembers (
    ElderlyId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ElderlyMembers PRIMARY KEY,
    CenterId INT NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE NULL,
    Gender NVARCHAR(10) NULL,
    Address NVARCHAR(255) NULL,
    EmergencyContactName NVARCHAR(100) NULL,
    EmergencyContactPhone NVARCHAR(20) NULL,
    Allergies NVARCHAR(1000) NULL,
    MedicalHistory NVARCHAR(1000) NULL,
    MedicalNotes NVARCHAR(1000) NULL,
    MobilityStatus NVARCHAR(50) NOT NULL CONSTRAINT DF_ElderlyMembers_MobilityStatus DEFAULT 'Normal',
    ChronicConditions NVARCHAR(255) NULL,
    CareNotes NVARCHAR(1000) NULL,
    EmergencyNotes NVARCHAR(1000) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ElderlyMembers_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ElderlyMembers_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(0) NULL,
    CONSTRAINT FK_ElderlyMembers_Centers FOREIGN KEY (CenterId) REFERENCES dbo.Centers(CenterId)
);

-- 4.7 Bảng ElderlyFamilyRelationships (Mối quan hệ thân nhân - người cao tuổi)
CREATE TABLE dbo.ElderlyFamilyRelationships (
    RelationshipId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ElderlyFamilyRelationships PRIMARY KEY,
    ElderlyId INT NOT NULL,
    FamilyMemberId INT NOT NULL,
    Relationship NVARCHAR(50) NOT NULL,
    IsPrimaryContact BIT NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_IsPrimary DEFAULT 0,
    CanViewCareLogs BIT NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_CanViewCareLogs DEFAULT 1,
    CanReceiveNotifications BIT NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_CanReceiveNotifications DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ElderlyFamilyRelationships_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId) ON DELETE CASCADE,
    CONSTRAINT FK_ElderlyFamilyRelationships_Family FOREIGN KEY (FamilyMemberId) REFERENCES dbo.FamilyMembers(FamilyMemberId) ON DELETE CASCADE,
    CONSTRAINT UQ_ElderlyFamilyRelationships UNIQUE (ElderlyId, FamilyMemberId)
);

-- 4.8 Bảng AuthorizedPickupPersons (Người được ủy quyền đón cụ lúc tan ca - BR-30)
CREATE TABLE dbo.AuthorizedPickupPersons (
    PickupPersonId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuthorizedPickupPersons PRIMARY KEY,
    ElderlyId INT NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    Relationship NVARCHAR(50) NULL,
    PhoneNumber NVARCHAR(20) NOT NULL,
    IdCardLast4 NVARCHAR(4) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_AuthorizedPickupPersons_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuthorizedPickupPersons_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AuthorizedPickupPersons_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId) ON DELETE CASCADE
);

-- 4.9 Bảng ServicePackages (5 Gói dịch vụ chính thức)
CREATE TABLE dbo.ServicePackages (
    PackageId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ServicePackages PRIMARY KEY,
    CenterId INT NOT NULL,
    PackageName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(1000) NULL,
    Price DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServicePackages_Price DEFAULT 0,
    BillingPeriod NVARCHAR(20) NOT NULL CONSTRAINT DF_ServicePackages_BillingPeriod DEFAULT 'Monthly',
    PricePerDay DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServicePackages_PricePerDay DEFAULT 0,
    PriceMonth3Days DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServicePackages_PriceMonth3Days DEFAULT 0,
    PriceMonthFullWeek DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServicePackages_PriceMonthFullWeek DEFAULT 0,
    Highlights NVARCHAR(2000) NULL,
    IncludedServices NVARCHAR(2000) NULL,
    TargetAudience NVARCHAR(500) NULL,
    PricingNote NVARCHAR(500) NULL,
    TotalSlots INT NOT NULL CONSTRAINT DF_ServicePackages_TotalSlots DEFAULT 20,
    EndOfLifeRoomIncluded BIT NOT NULL CONSTRAINT DF_ServicePackages_EndOfLife DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_ServicePackages_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ServicePackages_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ServicePackages_Centers FOREIGN KEY (CenterId) REFERENCES dbo.Centers(CenterId)
);

-- 4.10 Bảng ServiceRegistrations (Hợp đồng / Đăng ký gói)
CREATE TABLE dbo.ServiceRegistrations (
    RegistrationId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ServiceRegistrations PRIMARY KEY,
    CenterId INT NOT NULL,
    ElderlyId INT NOT NULL,
    PackageId INT NOT NULL,
    FamilyMemberId INT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_ServiceRegistrations_Status DEFAULT 'Pending',
    RegistrationCode NVARCHAR(50) NULL,
    RegistrationType NVARCHAR(30) NOT NULL CONSTRAINT DF_ServiceRegistrations_Type DEFAULT 'monthly',
    MonthlyPattern NVARCHAR(30) NULL,
    RoomType NVARCHAR(30) NOT NULL CONSTRAINT DF_ServiceRegistrations_RoomType DEFAULT 'large',
    TotalDays INT NOT NULL CONSTRAINT DF_ServiceRegistrations_TotalDays DEFAULT 1,
    SupportSurcharge DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServiceRegistrations_SupportSurcharge DEFAULT 0,
    RoomSurcharge DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServiceRegistrations_RoomSurcharge DEFAULT 0,
    TotalAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_ServiceRegistrations_TotalAmount DEFAULT 0,
    SelectedDatesJson NVARCHAR(4000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ServiceRegistrations_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ServiceRegistrations_Centers FOREIGN KEY (CenterId) REFERENCES dbo.Centers(CenterId),
    CONSTRAINT FK_ServiceRegistrations_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
    CONSTRAINT FK_ServiceRegistrations_Packages FOREIGN KEY (PackageId) REFERENCES dbo.ServicePackages(PackageId),
    CONSTRAINT FK_ServiceRegistrations_FamilyMembers FOREIGN KEY (FamilyMemberId) REFERENCES dbo.FamilyMembers(FamilyMemberId)
);

-- 4.11 Bảng Invoices (Hóa đơn dịch vụ)
CREATE TABLE dbo.Invoices (
    InvoiceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Invoices PRIMARY KEY,
    RegistrationId INT NOT NULL,
    InvoiceNo NVARCHAR(50) NOT NULL,
    InvoiceVatNo NVARCHAR(50) NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Invoices_Status DEFAULT N'Pending',
    IssuedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Invoices_IssuedAt DEFAULT SYSDATETIME(),
    DueAt DATETIME2(0) NULL,
    CONSTRAINT FK_Invoices_ServiceRegistrations FOREIGN KEY (RegistrationId) REFERENCES dbo.ServiceRegistrations(RegistrationId)
);

-- 4.12 Bảng Payments (Thanh toán giao dịch)
CREATE TABLE dbo.Payments (
    PaymentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Payments PRIMARY KEY,
    RegistrationId INT NOT NULL,
    InvoiceId INT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    PaymentDate DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_PaymentDate DEFAULT SYSDATETIME(),
    PaymentMethod NVARCHAR(100) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'Completed',
    TransactionReference NVARCHAR(100) NULL,
    InvoiceNo NVARCHAR(50) NULL,
    InvoiceVatNo NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Payments_ServiceRegistrations FOREIGN KEY (RegistrationId) REFERENCES dbo.ServiceRegistrations(RegistrationId) ON DELETE CASCADE,
    CONSTRAINT FK_Payments_Invoices FOREIGN KEY (InvoiceId) REFERENCES dbo.Invoices(InvoiceId)
);

-- 4.13 Bảng MedicalSupplies (Danh mục vật tư y tế sơ cứu - WF-05 / F-14)
CREATE TABLE dbo.MedicalSupplies (
    SupplyId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MedicalSupplies PRIMARY KEY,
    SupplyName NVARCHAR(100) NOT NULL,
    Unit NVARCHAR(20) NOT NULL,
    MinimumStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_MinimumStock DEFAULT 0,
    QuantityInStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_QuantityInStock DEFAULT 0,
    UnitPrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_UnitPrice DEFAULT 0,
    ExpiryDate DATE NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_MedicalSupplies_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicalSupplies_CreatedAt DEFAULT SYSDATETIME()
);

-- 4.14 Bảng IncidentReports (Báo cáo & Xử lý sự cố y tế - WF-05 / F-13)
CREATE TABLE dbo.IncidentReports (
    IncidentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_IncidentReports PRIMARY KEY,
    ElderlyId INT NOT NULL,
    ReportedBy INT NOT NULL,
    HandledBy INT NULL,
    IncidentType NVARCHAR(100) NOT NULL,
    Severity NVARCHAR(30) NOT NULL,
    Description NVARCHAR(2000) NOT NULL,
    HandlingActions NVARCHAR(2000) NULL,
    HospitalName NVARCHAR(200) NULL,
    HospitalTransferAt DATETIME2(0) NULL,
    HospitalEscort NVARCHAR(200) NULL,
    PhotoUrls NVARCHAR(MAX) NULL,
    SupplyChargeAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_IncidentReports_SupplyChargeAmount DEFAULT 0,
    IsSupplyConfirmed BIT NOT NULL CONSTRAINT DF_IncidentReports_IsSupplyConfirmed DEFAULT 0,
    OccurredAt DATETIME2(0) NOT NULL,
    ReportedAt DATETIME2(0) NOT NULL CONSTRAINT DF_IncidentReports_ReportedAt DEFAULT SYSDATETIME(),
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_IncidentReports_Status DEFAULT 'Open',
    ResolutionNotes NVARCHAR(2000) NULL,
    ResolvedAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_IncidentReports_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_IncidentReports_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
    CONSTRAINT FK_IncidentReports_Users FOREIGN KEY (ReportedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_IncidentReports_HandledBy FOREIGN KEY (HandledBy) REFERENCES dbo.Users(UserId)
);

-- 4.15 Bảng SupplyTransactions (Sổ cái bất biến ghi nhận biến động vật tư - D2 / F-14)
CREATE TABLE dbo.SupplyTransactions (
    SupplyTransactionId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_SupplyTransactions PRIMARY KEY,
    SupplyId INT NOT NULL,
    IncidentId INT NULL,
    TransactionType NVARCHAR(30) NOT NULL, -- IN / OUT / INCIDENT
    Quantity DECIMAL(18,2) NOT NULL,
    UnitPrice DECIMAL(18,2) NULL,
    OccurredAt DATETIME2(0) NOT NULL CONSTRAINT DF_SupplyTransactions_OccurredAt DEFAULT SYSDATETIME(),
    RecordedBy INT NOT NULL,
    Notes NVARCHAR(500) NULL,
    CONSTRAINT FK_SupplyTransactions_Supplies FOREIGN KEY (SupplyId) REFERENCES dbo.MedicalSupplies(SupplyId),
    CONSTRAINT FK_SupplyTransactions_Incidents FOREIGN KEY (IncidentId) REFERENCES dbo.IncidentReports(IncidentId),
    CONSTRAINT FK_SupplyTransactions_Users FOREIGN KEY (RecordedBy) REFERENCES dbo.Users(UserId)
);

-- 4.16 Bảng AttendanceRecords (Điểm danh hàng ngày)
CREATE TABLE dbo.AttendanceRecords (
    AttendanceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AttendanceRecords PRIMARY KEY,
    ElderlyId INT NOT NULL,
    RegistrationId INT NULL,
    AttendanceDate DATE NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_AttendanceRecords_Status DEFAULT 'Present',
    CheckInTime TIME(0) NULL,
    CheckOutTime TIME(0) NULL,
    CheckedInBy INT NULL,
    CheckedOutBy INT NULL,
    PickupPersonId INT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AttendanceRecords_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AttendanceRecords_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
    CONSTRAINT FK_AttendanceRecords_Registrations FOREIGN KEY (RegistrationId) REFERENCES dbo.ServiceRegistrations(RegistrationId),
    CONSTRAINT FK_AttendanceRecords_CheckedIn FOREIGN KEY (CheckedInBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_AttendanceRecords_CheckedOut FOREIGN KEY (CheckedOutBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_AttendanceRecords_PickupPerson FOREIGN KEY (PickupPersonId) REFERENCES dbo.AuthorizedPickupPersons(PickupPersonId)
);

-- 4.17 Bảng CareLogs (Nhật ký chăm sóc hàng ngày)
CREATE TABLE dbo.CareLogs (
    CareLogId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CareLogs PRIMARY KEY,
    ElderlyId INT NOT NULL,
    StaffId INT NOT NULL,
    CareDate DATE NOT NULL,
    CareType NVARCHAR(50) NOT NULL, -- MEAL, VITALS, ACTIVITY, NAP, NOTE, HYGIENE, MOOD
    Description NVARCHAR(1000) NULL,
    Notes NVARCHAR(500) NULL,
    Data NVARCHAR(MAX) NULL,
    IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0,
    BloodPressure NVARCHAR(50) NULL,
    BloodGlucose DECIMAL(5,2) NULL,
    HeartRate INT NULL,
    Temperature DECIMAL(4,1) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogs_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_CareLogs_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
    CONSTRAINT FK_CareLogs_Users FOREIGN KEY (StaffId) REFERENCES dbo.Users(UserId)
);

-- 4.18 Bảng CareLogPhotos
CREATE TABLE dbo.CareLogPhotos (
    CareLogPhotoId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CareLogPhotos PRIMARY KEY,
    CareLogId INT NOT NULL,
    FileUrl NVARCHAR(1000) NOT NULL,
    UploadedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogPhotos_UploadedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_CareLogPhotos_CareLogs FOREIGN KEY (CareLogId) REFERENCES dbo.CareLogs(CareLogId) ON DELETE CASCADE
);

-- 4.19 Bảng DailySchedulePlans (Kế hoạch vận hành ngày)
CREATE TABLE dbo.DailySchedulePlans (
    PlanId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DailySchedulePlans PRIMARY KEY,
    CenterId INT NOT NULL,
    PlanDate DATE NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_DailySchedulePlans_Status DEFAULT 'Draft',
    ConfirmedAt DATETIME2(0) NULL,
    ConfirmedBy INT NULL,
    TotalStaff INT NOT NULL CONSTRAINT DF_DailySchedulePlans_TotalStaff DEFAULT 0,
    TotalElderly INT NOT NULL CONSTRAINT DF_DailySchedulePlans_TotalElderly DEFAULT 0,
    Notes NVARCHAR(1000) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DailySchedulePlans_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(0) NULL,
    CONSTRAINT FK_DailySchedulePlans_Centers FOREIGN KEY (CenterId) REFERENCES dbo.Centers(CenterId),
    CONSTRAINT FK_DailySchedulePlans_Users FOREIGN KEY (ConfirmedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_DailySchedulePlans_Center_Date UNIQUE (CenterId, PlanDate)
);

-- 4.20 Bảng StaffCareAssignments
CREATE TABLE dbo.StaffCareAssignments (
    AssignmentId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StaffCareAssignments PRIMARY KEY,
    PlanId INT NOT NULL,
    StaffId INT NOT NULL,
    ElderlyId INT NOT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffCareAssignments_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_StaffCareAssignments_Plans FOREIGN KEY (PlanId) REFERENCES dbo.DailySchedulePlans(PlanId) ON DELETE CASCADE,
    CONSTRAINT FK_StaffCareAssignments_Users FOREIGN KEY (StaffId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_StaffCareAssignments_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
    CONSTRAINT UQ_StaffCareAssignments_Plan_Elderly UNIQUE (PlanId, ElderlyId)
);

-- 4.21 Bảng StaffSchedules (Lịch trực của nhân viên)
CREATE TABLE dbo.StaffSchedules (
    ScheduleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_StaffSchedules PRIMARY KEY,
    StaffId INT NOT NULL,
    WorkDate DATE NOT NULL,
    IsWorking BIT NOT NULL CONSTRAINT DF_StaffSchedules_IsWorking DEFAULT 1,
    Note NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffSchedules_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_StaffSchedules_Users FOREIGN KEY (StaffId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UQ_StaffSchedules_Staff_Date UNIQUE (StaffId, WorkDate)
);

-- 4.22 Bảng StaffProfiles
CREATE TABLE dbo.StaffProfiles (
    UserId INT NOT NULL CONSTRAINT PK_StaffProfiles PRIMARY KEY,
    Position NVARCHAR(100) NULL,
    Qualification NVARCHAR(300) NULL,
    StartDate DATE NULL,
    UpdatedAt DATETIME2(0) NULL,
    CONSTRAINT FK_StaffProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);

-- 4.23 Bảng StaffRequests (Đơn nghỉ / đổi ca)
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
    CONSTRAINT FK_StaffRequests_Staff FOREIGN KEY (StaffId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_StaffRequests_SwapStaff FOREIGN KEY (SwapWithStaffId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_StaffRequests_Reviewer FOREIGN KEY (ReviewedBy) REFERENCES dbo.Users(UserId)
);

-- 4.24 Bảng AbsenceReports (Báo vắng người cao tuổi)
CREATE TABLE dbo.AbsenceReports (
    AbsenceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AbsenceReports PRIMARY KEY,
    ElderlyId INT NOT NULL,
    AbsenceDate DATE NOT NULL,
    Reason NVARCHAR(500) NULL,
    ReportedBy INT NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AbsenceReports_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AbsenceReports_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId) ON DELETE CASCADE,
    CONSTRAINT FK_AbsenceReports_Users FOREIGN KEY (ReportedBy) REFERENCES dbo.Users(UserId),
    CONSTRAINT UQ_AbsenceReports_ElderlyDate UNIQUE (ElderlyId, AbsenceDate)
);

-- 4.25 Bảng MedicationPlans (Kế hoạch dùng thuốc)
CREATE TABLE dbo.MedicationPlans (
    MedicationPlanId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MedicationPlans PRIMARY KEY,
    ElderlyId INT NOT NULL,
    MedicationName NVARCHAR(100) NOT NULL,
    Dosage NVARCHAR(50) NOT NULL,
    Frequency NVARCHAR(50) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NULL,
    Instructions NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_MedicationPlans_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicationPlans_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_MedicationPlans_Elderly FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId)
);

-- 4.26 Bảng MedicationRecords (Lịch sử uống thuốc thực tế)
CREATE TABLE dbo.MedicationRecords (
    MedicationRecordId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_MedicationRecords PRIMARY KEY,
    MedicationPlanId INT NOT NULL,
    AdministeredDate DATE NOT NULL,
    AdministeredTime TIME(0) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_MedicationRecords_Status DEFAULT 'Scheduled',
    StaffId INT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicationRecords_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_MedicationRecords_Plans FOREIGN KEY (MedicationPlanId) REFERENCES dbo.MedicationPlans(MedicationPlanId),
    CONSTRAINT FK_MedicationRecords_Users FOREIGN KEY (StaffId) REFERENCES dbo.Users(UserId)
);

-- 4.27 Bảng Notifications (Thông báo)
CREATE TABLE dbo.Notifications (
    NotificationId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
    UserId INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    NotificationType NVARCHAR(50) NOT NULL CONSTRAINT DF_Notifications_Type DEFAULT 'General',
    RelatedEntityType NVARCHAR(50) NULL,
    RelatedEntityId INT NULL,
    IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);

-- 4.28 Bảng AuditLogs (Nhật ký kiểm toán hệ thống)
CREATE TABLE dbo.AuditLogs (
    AuditLogId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    ActorUserId INT NULL,
    Action NVARCHAR(100) NOT NULL,
    EntityName NVARCHAR(100) NOT NULL,
    EntityId NVARCHAR(100) NULL,
    Details NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (ActorUserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);
GO

PRINT N'-> Đã hoàn thành cấu trúc bảng.';

-- ===================================================================================
-- 5. CHÈN DỮ LIỆU MẪU FULL THỰC TẾ (SEED DATA)
-- ===================================================================================
PRINT N'--- Bắt đầu chèn dữ liệu thực tế ---';

-- 5.1 SEED ROLES
SET IDENTITY_INSERT dbo.Roles ON;
INSERT INTO dbo.Roles (RoleId, RoleName, Description) VALUES
(1, N'Admin',        N'Quản trị viên toàn quyền hệ thống'),
(2, N'Center',       N'Quản lý trung tâm dưỡng lão'),
(3, N'Staff',        N'Nhân viên chăm sóc và điều dưỡng'),
(4, N'FamilyMember', N'Thành viên gia đình của người cao tuổi');
SET IDENTITY_INSERT dbo.Roles OFF;
PRINT N'-> Đã seed 4 Vai trò (Roles).';

-- 5.2 SEED USERS (Mật khẩu mặc định: 123456 hoặc Admin@123456)
-- Hash PBKDF2 chuẩn cho password '123456':
-- PBKDF2$100000$AEtmuxvxxLbtaAyi3gCI/g==$k5VJKi8W5iYEM7415QUxWNRu8esj4HV7YY9FInP+ZUg=
-- Fallback SHA256 cho '123456': 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
DECLARE @pwdHash123456 NVARCHAR(255) = N'PBKDF2$100000$AEtmuxvxxLbtaAyi3gCI/g==$k5VJKi8W5iYEM7415QUxWNRu8esj4HV7YY9FInP+ZUg=';
DECLARE @pwdHashAdmin NVARCHAR(255) = N'PBKDF2$100000$GdiKtRUCKhktycnotq39Lg==$hmW1vPVuOeNnH5+kO8nOgYie7vgrxySiPICmZwYy5tQ=';

SET IDENTITY_INSERT dbo.Users ON;
INSERT INTO dbo.Users (UserId, Email, PasswordHash, FullName, PhoneNumber, IsActive, CreatedAt) VALUES
(1, N'admin@daycare.com',       @pwdHash123456, N'Hệ Thống Quản Trị Viên', N'0901234567', 1, GETUTCDATE()),
(2, N'center_test@daycare.com', @pwdHash123456, N'Test Center Manager',     N'0900000002', 1, GETUTCDATE()),
(3, N'staff_test@daycare.com',  @pwdHash123456, N'Test Staff',             N'0900000001', 1, GETUTCDATE()),
(4, N'family_test@daycare.com', @pwdHash123456, N'Test Family',            N'0900000003', 1, GETUTCDATE());
SET IDENTITY_INSERT dbo.Users OFF;

-- Gán vai trò (UserRoles)
INSERT INTO dbo.UserRoles (UserId, RoleId) VALUES
(1, 1), -- admin -> Admin
(2, 2), -- center_test -> Center
(3, 3), -- staff_test -> Staff
(4, 4); -- family_test -> FamilyMember
PRINT N'-> Đã seed 4 Người dùng (admin, center_test, staff_test, family_test - mật khẩu: 123456).';

-- 5.3 SEED CENTERS (Cơ sở dưỡng lão)
SET IDENTITY_INSERT dbo.Centers ON;
INSERT INTO dbo.Centers (CenterId, CenterName, Address, PhoneNumber, Email, IsActive, CreatedAt) VALUES
(1, N'Trung tâm dưỡng lão ban ngày Bình An', N'Số 123 Đường Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh', N'02838999999', N'contact@daycarebinhan.vn', 1, GETUTCDATE());
SET IDENTITY_INSERT dbo.Centers OFF;
PRINT N'-> Đã seed Trung tâm dưỡng lão Bình An.';

-- 5.4 SEED FAMILY MEMBERS
SET IDENTITY_INSERT dbo.FamilyMembers ON;
INSERT INTO dbo.FamilyMembers (FamilyMemberId, UserId, Address, EmergencyContact, RelationshipToElderly, CreatedAt) VALUES
(1, 4, N'Số 45 Đường Đặng Văn Bi, TP. Thủ Đức, TP.HCM', N'0900000003', N'Con trai', GETUTCDATE());
SET IDENTITY_INSERT dbo.FamilyMembers OFF;

-- 5.5 SEED 5 GÓI DỊCH VỤ CHUẨN
SET IDENTITY_INSERT dbo.ServicePackages ON;
INSERT INTO dbo.ServicePackages (
    PackageId, CenterId, PackageName, Description, Price, BillingPeriod,
    PricePerDay, PriceMonth3Days, PriceMonthFullWeek, Highlights, IncludedServices,
    TargetAudience, PricingNote, TotalSlots, EndOfLifeRoomIncluded, IsActive, CreatedAt
) VALUES
(1, 1, N'Cơ bản', 
    N'Dành cho người cao tuổi khỏe mạnh hoặc giảm nhẹ vận động, cần giao lưu và sinh hoạt ban ngày.',
    6000000, N'Monthly', 300000, 3300000, 6000000,
    N'Chăm sóc bán trú 07:00 – 17:00;3 bữa ăn dinh dưỡng đầy đủ;Kiểm tra sức khỏe cơ bản mỗi sáng;Hoạt động thể dục dưỡng sinh, giải trí nhẹ',
    N'Bán trú tiêu chuẩn;Bữa sáng, bữa trưa, bữa phụ chiều;Theo dõi chỉ số sinh tồn;Nhật ký theo dõi hàng ngày',
    N'Người cao tuổi tự chủ sinh hoạt, cần môi trường giao lưu kết bạn',
    N'Phụ phí hỗ trợ tăng cường nếu cụ cần hỗ trợ di chuyển.', 45, 0, 1, GETUTCDATE()),

(2, 1, N'Phục hồi chức năng',
    N'Dành cho người cao tuổi sau phẫu thuật, gãy xương, suy giảm chức năng vận động hoặc có bệnh cơ xương khớp.',
    9000000, N'Monthly', 450000, 4950000, 9000000,
    N'Vật lý trị liệu chuyên biệt mỗi ngày;Phòng tập phục hồi chức năng hiện đại;Theo dõi tầm vận động khớp định kỳ;Kế hoạch tập luyện cá nhân hóa',
    N'Toàn bộ quyền lợi Gói Cơ bản;Buổi tập vật lý trị liệu hàng ngày;Đánh giá chức năng vận động hàng tuần',
    N'Người cao tuổi có chỉ định phục hồi chức năng, thoái hóa khớp',
    N'', 20, 0, 1, GETUTCDATE()),

(3, 1, N'Sa sút trí tuệ',
    N'Dành cho người cao tuổi suy giảm nhận thức, hay quên, Alzheimer nhẹ đến trung bình.',
    10000000, N'Monthly', 500000, 5500000, 10000000,
    N'Khuôn viên khép kín, an toàn tuyệt đối 24/7;Liệu pháp âm nhạc, mùi hương, gợi nhớ ký ức;Điều dưỡng viên chuyên trách sa sút trí tuệ;Lịch sinh hoạt cố định giúp tâm lý an ổn',
    N'Toàn bộ quyền lợi Gói Cơ bản;Điều dưỡng chuyên trách hỗ trợ 1-1;Liệu pháp kích thích nhận thức;Vườn an toàn khép kín',
    N'Người cao tuổi mắc bệnh Alzheimer, suy giảm trí nhớ từ nhẹ đến trung bình',
    N'', 15, 0, 1, GETUTCDATE()),

(4, 1, N'Sau tai biến',
    N'Dành cho người cao tuổi có di chứng tai biến mạch máu não, liệt nửa người, rối loạn nuốt hoặc phát âm.',
    11000000, N'Monthly', 550000, 6050000, 11000000,
    N'Tập chống co cứng cơ và phục hồi chức năng vận động;Âm ngữ trị liệu, tập nuốt an toàn;Y học cổ truyền: bấm huyệt, ngâm chân thảo mộc;Theo dõi chỉ số huyết áp, tim mạch liên tục',
    N'Toàn bộ quyền lợi Gói Cơ bản;Phục hồi chức năng tai biến chuyên sâu;Âm ngữ trị liệu và tập nuốt;Bấm huyệt thư giãn cơ',
    N'Người cao tuổi sau đột quỵ/tai biến dưới 1 năm',
    N'', 12, 0, 1, GETUTCDATE()),

(5, 1, N'Giai đoạn cuối',
    N'Dành cho người cao tuổi cần chăm sóc giảm nhẹ, tạo sự thoải mái tối đa và đồng hành tinh thần những năm tháng cuối đời.',
    14000000, N'Monthly', 700000, 7700000, 14000000,
    N'Phòng VIP 1–2 người yên tĩnh đã bao gồm trọn gói;Chăm sóc giảm nhẹ, xoa bóp lăn trở chống loét từng giờ;Đồng hành tinh thần, kết nối gia đình mọi lúc;Chế độ dinh dưỡng đặc biệt, nấu theo yêu cầu của cụ',
    N'Toàn bộ quyền lợi Gói Cơ bản;Phòng VIP 1–2 người riêng tư (đã bao gồm);Chăm sóc giảm đau, giảm nhẹ;Điều dưỡng túc trực 24/7',
    N'Người cao tuổi sức khỏe suy kiệt cần chăm sóc an dưỡng thoải mái',
    N'Lưu ý: Dịch vụ chăm sóc thoải mái, không thay thế cơ sở y tế chuyên khoa.', 8, 1, 1, GETUTCDATE());
SET IDENTITY_INSERT dbo.ServicePackages OFF;
PRINT N'-> Đã seed 5 Gói dịch vụ chuẩn của trung tâm.';

-- 5.6 SEED 5 NGƯỜI CAO TUỔI THỰC TẾ
SET IDENTITY_INSERT dbo.ElderlyMembers ON;
INSERT INTO dbo.ElderlyMembers (
    ElderlyId, CenterId, FullName, DateOfBirth, Gender, Address,
    EmergencyContactName, EmergencyContactPhone, MobilityStatus,
    Allergies, MedicalHistory, MedicalNotes, ChronicConditions,
    IsActive, CreatedAt
) VALUES
(1, 1, N'Nguyễn Văn An',  '1948-05-12', N'Male',   N'Quận 9, TP. Thủ Đức, TP.HCM', N'Nguyễn Văn Thử Nghiệm', N'0987654321', N'Normal',  N'Dị ứng Penicillin', N'Tăng huyết áp độ 1', N'Hay đau đầu lúc đổi thời tiết', N'HYPERTENSION', 1, GETUTCDATE()),
(2, 1, N'Trần Thị Bình',  '1942-08-20', N'Female', N'Quận 2, TP. Thủ Đức, TP.HCM', N'Trần Tuấn Kiệt',       N'0912345678', N'Support', N'Không có',           N'Thoái hóa khớp gối, loãng xương', N'Cần dìu khi lên xuống bậc tam cấp', N'BONE', 1, GETUTCDATE()),
(3, 1, N'Lê Văn Cường',   '1945-11-03', N'Male',   N'Bình Thạnh, TP.HCM',         N'Lê Hoàng Phúc',        N'0933221100', N'Normal',  N'Dị ứng Aspirin',    N'Tiểu đường tuýp 2', N'Theo dõi đường huyết trước bữa ăn', N'DIABETES', 1, GETUTCDATE()),
(4, 1, N'Phạm Thị Dung',  '1951-03-15', N'Female', N'Thủ Đức, TP.HCM',            N'Phạm Thị Thảo',        N'0977889900', N'Support', N'Không có',           N'Tiền đình, hay chóng mặt', N'Không để cụ ngồi dậy đột ngột', N'VESTIBULAR', 1, GETUTCDATE()),
(5, 1, N'Hoàng Văn Em',   '1946-09-28', N'Male',   N'Quận 9, TP.HCM',             N'Hoàng Quốc Bảo',       N'0909876543', N'Normal',  N'Không có',           N'Sức khỏe ổn định', N'Tâm trạng vui vẻ, thích chơi cờ', N'HEALTHY', 1, GETUTCDATE());
SET IDENTITY_INSERT dbo.ElderlyMembers OFF;
PRINT N'-> Đã seed 5 Hồ sơ người cao tuổi thực tế.';

-- 5.7 LIÊN KẾT GIA ĐÌNH VỚI NGƯỜI CAO TUỔI (family_test -> Cụ Nguyễn Văn An)
INSERT INTO dbo.ElderlyFamilyRelationships (ElderlyId, FamilyMemberId, Relationship, IsPrimaryContact, CanViewCareLogs, CanReceiveNotifications) VALUES
(1, 1, N'Con trai', 1, 1, 1);

-- 5.8 NGƯỜI ĐƯỢC ỦY QUYỀN ĐÓN CỤ (BR-30)
INSERT INTO dbo.AuthorizedPickupPersons (ElderlyId, FullName, Relationship, PhoneNumber, IdCardLast4, IsActive) VALUES
(1, N'Nguyễn Văn Thử Nghiệm', N'Con trai', N'0987654321', N'1234', 1),
(2, N'Trần Tuấn Kiệt',       N'Cháu nội', N'0912345678', N'5678', 1);

-- 5.9 SEED 8 MẶT HÀNG VẬT TƯ Y TẾ SƠ CỨU (WF-05 / F-14 / SR-04)
SET IDENTITY_INSERT dbo.MedicalSupplies ON;
INSERT INTO dbo.MedicalSupplies (
    SupplyId, SupplyName, Unit, MinimumStock, QuantityInStock, UnitPrice, ExpiryDate, IsActive, CreatedAt
) VALUES
(1, N'Băng cuộn y tế tiệt trùng 10cm x 2m', N'Cuộn', 10.0, 45.0, 15000.0, '2027-12-31', 1, GETUTCDATE()),
(2, N'Gạc vô trùng đắp vết thương 10x10cm', N'Miếng', 20.0, 80.0, 5000.0,  '2028-01-01', 1, GETUTCDATE()),
(3, N'Cồn đỏ sát trùng Povidine 10% (20ml)', N'Chai', 5.0,  18.0, 25000.0, '2026-12-15', 1, GETUTCDATE()), -- Cận hạn ~18 ngày (SR-04 Warning)
(4, N'Nước muối sinh lý NaCl 0.9% (500ml)', N'Chai', 8.0,  25.0, 10000.0, '2027-10-20', 1, GETUTCDATE()),
(5, N'Bông gòn y tế Bạch Tuyết (50g)',       N'Gói',  5.0,  30.0, 12000.0, '2027-06-30', 1, GETUTCDATE()),
(6, N'Băng dán cá nhân thông khí Urgo',      N'Hộp',  3.0,  12.0, 35000.0, '2027-08-15', 1, GETUTCDATE()),
(7, N'Cồn y tế sát khuẩn 70 độ (500ml)',    N'Chai', 5.0,  15.0, 28000.0, '2026-11-30', 1, GETUTCDATE()), -- Cận hạn nguy cấp (SR-04 Critical)
(8, N'Nẹp cố định chấn thương tay chân',     N'Cái',  2.0,  8.0,  65000.0, '2029-12-31', 1, GETUTCDATE());
SET IDENTITY_INSERT dbo.MedicalSupplies OFF;
PRINT N'-> Đã seed 8 Mặt hàng kho vật tư y tế (kèm đơn giá, tồn kho và hạn dùng cảnh báo SR-04).';

-- 5.10 SEED 3 CA SỰ CỐ Y TẾ MẪU (WF-05 / F-13)
SET IDENTITY_INSERT dbo.IncidentReports ON;
INSERT INTO dbo.IncidentReports (
    IncidentId, ElderlyId, ReportedBy, HandledBy, IncidentType, Severity, Description,
    HandlingActions, HospitalName, HospitalTransferAt, HospitalEscort, PhotoUrls,
    SupplyChargeAmount, IsSupplyConfirmed, OccurredAt, ReportedAt, Status, ResolutionNotes, ResolvedAt, CreatedAt
) VALUES
-- Ca 1: Sự cố té ngã đã xử lý, có trừ vật tư và tính phụ phí riêng cho gia đình (F-14 / D2)
(1, 1, 3, 3, N'Té ngã nhẹ tại hành lang', N'Medium',
    N'Cụ bị hụt chân ngã nhẹ ở hành lang phòng sinh hoạt chung, xây xát nhẹ ở đầu gối phải. Đã tiến hành sát trùng bằng Povidine và băng gạc vô trùng.',
    N'Đỡ cụ ngồi dậy an toàn, kiểm tra xương khớp không gãy, rửa vết thương bằng nước muối sinh lý, sát khuẩn Povidine và đắp gạc vô trùng.',
    NULL, NULL, NULL, NULL,
    35000.0, 1,
    DATEADD(DAY, -2, GETUTCDATE()), DATEADD(DAY, -2, GETUTCDATE()), N'Resolved',
    N'Cụ tỉnh táo hoàn toàn, đi lại bình thường, vết xước khô ráo, không sưng đau.',
    DATEADD(HOUR, 1, DATEADD(DAY, -2, GETUTCDATE())), GETUTCDATE()),

-- Ca 2: Sự cố chuyển viện khẩn cấp (SRS 3.9.1 / Mẫu phiếu in chuyển viện 05-YTE/BG-CV)
(2, 2, 3, 3, N'Tụt huyết áp & Khó thở cấp', N'Critical',
    N'Cụ có biểu hiện chóng mặt dữ dội, vã mồ hôi, huyết áp đo được 85/50 mmHg kèm thở dốc. Đã cho thở oxy hỗ trợ và lập tức điều xe chuyển viện cấp cứu.',
    N'Đặt cụ nằm đầu thấp, nới lỏng quần áo, hỗ trợ thở oxy mask 3L/phút, liên hệ khẩn cấp thân nhân và gọi xe cứu thương chuyển viện.',
    N'Bệnh viện Đa khoa Khu vực Thủ Đức', DATEADD(HOUR, -4, GETUTCDATE()), N'Y tá Trần Thị Thảo (Khoa Y tế)', NULL,
    0.0, 0,
    DATEADD(HOUR, -5, GETUTCDATE()), DATEADD(HOUR, -5, GETUTCDATE()), N'InProgress',
    N'Đang được các bác sĩ khoa Cấp cứu bệnh viện theo dõi và truyền dịch nâng huyết áp.',
    NULL, GETUTCDATE()),

-- Ca 3: Sự cố mới ghi nhận (Open)
(3, 3, 3, 3, N'Sốt nhẹ sau giờ ăn trưa', N'Low',
    N'Cụ có dấu hiệu mệt mỏi sau bữa trưa, đo nhiệt độ 38.2 độ C, không ho, không khó thở.',
    N'Cho cụ nằm nghỉ tại phòng y tế thoáng mát, chườm ấm trán và nách, cho uống 200ml nước ấm bù điện giải.',
    NULL, NULL, NULL, NULL,
    0.0, 0,
    DATEADD(HOUR, -2, GETUTCDATE()), DATEADD(HOUR, -2, GETUTCDATE()), N'Open',
    NULL,
    NULL, GETUTCDATE());
SET IDENTITY_INSERT dbo.IncidentReports OFF;
PRINT N'-> Đã seed 3 Ca sự cố y tế mẫu (Té ngã đã trừ vật tư, Chuyển viện khẩn cấp, Sốt nhẹ).';

-- 5.11 SEED SỔ CÁI BẤT BIẾN SUPPLY TRANSACTIONS (Ghi nhận trừ kho cho Ca sự cố 1 - Quyết định D2)
SET IDENTITY_INSERT dbo.SupplyTransactions ON;
INSERT INTO dbo.SupplyTransactions (
    SupplyTransactionId, SupplyId, IncidentId, TransactionType, Quantity, UnitPrice, OccurredAt, RecordedBy, Notes
) VALUES
(1, 3, 1, N'INCIDENT', 1.0, 25000.0, DATEADD(DAY, -2, GETUTCDATE()), 3, N'Xuất 1 lọ Povidine sát khuẩn vết thương cụ Nguyễn Văn An (Sự cố #1)'),
(2, 2, 1, N'INCIDENT', 2.0, 5000.0,  DATEADD(DAY, -2, GETUTCDATE()), 3, N'Xuất 2 miếng gạc vô trùng băng vết thương cụ Nguyễn Văn An (Sự cố #1)');
SET IDENTITY_INSERT dbo.SupplyTransactions OFF;
PRINT N'-> Đã seed Giao dịch trừ kho vào sổ cái SupplyTransactions.';

-- 5.12 SEED ĐĂNG KÝ GÓI & THANH TOÁN (Hợp đồng mẫu)
SET IDENTITY_INSERT dbo.ServiceRegistrations ON;
INSERT INTO dbo.ServiceRegistrations (
    RegistrationId, CenterId, ElderlyId, PackageId, FamilyMemberId, StartDate, EndDate,
    Status, RegistrationCode, RegistrationType, MonthlyPattern, RoomType, TotalDays,
    SupportSurcharge, RoomSurcharge, TotalAmount, CreatedAt
) VALUES
(1, 1, 1, 1, 1, '2026-11-01', '2026-11-30', N'Active', N'REG-2026-0001', N'monthly', N'fullWeek', N'large', 22, 0, 0, 6000000.0, GETUTCDATE()),
(2, 1, 2, 3, 1, '2026-11-01', '2026-11-30', N'Active', N'REG-2026-0002', N'monthly', N'fullWeek', N'large', 22, 0, 0, 10000000.0, GETUTCDATE());
SET IDENTITY_INSERT dbo.ServiceRegistrations OFF;

-- Hóa đơn
SET IDENTITY_INSERT dbo.Invoices ON;
INSERT INTO dbo.Invoices (InvoiceId, RegistrationId, InvoiceNo, InvoiceVatNo, TotalAmount, Status, IssuedAt) VALUES
(1, 1, N'HD-2026-0001', N'VAT-001', 6000000.0,  N'Paid', GETUTCDATE()),
(2, 2, N'HD-2026-0002', N'VAT-002', 10000000.0, N'Paid', GETUTCDATE());
SET IDENTITY_INSERT dbo.Invoices OFF;

-- Thanh toán
SET IDENTITY_INSERT dbo.Payments ON;
INSERT INTO dbo.Payments (PaymentId, RegistrationId, InvoiceId, Amount, PaymentDate, PaymentMethod, Status, TransactionReference, InvoiceNo) VALUES
(1, 1, 1, 6000000.0,  GETUTCDATE(), N'VNPay / Chuyển khoản', N'Completed', N'VNP20261101001', N'HD-2026-0001'),
(2, 2, 2, 10000000.0, GETUTCDATE(), N'VNPay / Chuyển khoản', N'Completed', N'VNP20261101002', N'HD-2026-0002');
SET IDENTITY_INSERT dbo.Payments OFF;
PRINT N'-> Đã seed Hợp đồng dịch vụ, Hóa đơn và Thanh toán.';

-- 5.13 SEED ĐIỂM DANH HÔM NAY (AttendanceRecords)
INSERT INTO dbo.AttendanceRecords (ElderlyId, RegistrationId, AttendanceDate, Status, CheckInTime, CheckedInBy, Notes) VALUES
(1, 1, CAST(GETUTCDATE() AS DATE), N'Present', '07:15:00', 3, N'Cụ đến đúng giờ, tinh thần vui vẻ'),
(2, 2, CAST(GETUTCDATE() AS DATE), N'Present', '07:30:00', 3, N'Cụ đi cùng cháu nội');

-- 5.14 SEED NHẬT KÝ CHĂM SÓC (CareLogs - Bữa ăn & Đo sinh hiệu)
INSERT INTO dbo.CareLogs (ElderlyId, StaffId, CareDate, CareType, Description, BloodPressure, BloodGlucose, HeartRate, Temperature, CreatedAt) VALUES
(1, 3, CAST(GETUTCDATE() AS DATE), N'VITALS', N'Đo chỉ số sinh tồn buổi sáng: Huyết áp ổn định, đường huyết tốt.', N'120/80', 5.6, 75, 36.6, GETUTCDATE()),
(1, 3, CAST(GETUTCDATE() AS DATE), N'MEAL',   N'Cụ dùng hết khẩu phần ăn sáng (cháo yến mạch thịt bằm).', NULL, NULL, NULL, NULL, GETUTCDATE()),
(2, 3, CAST(GETUTCDATE() AS DATE), N'VITALS', N'Đo chỉ số buổi sáng: Huyết áp hơi thấp nhẹ, cho cụ uống trà ấm.', N'105/70', 6.1, 72, 36.8, GETUTCDATE());

-- 5.15 SEED KẾ HOẠCH DÙNG THUỐC (MedicationPlans)
INSERT INTO dbo.MedicationPlans (ElderlyId, MedicationName, Dosage, Frequency, StartDate, Instructions, IsActive) VALUES
(1, N'Amlodipine 5mg', N'1 viên', N'Sáng sau ăn', '2026-11-01', N'Uống cố định 08:00 sáng sau khi ăn sáng', 1),
(3, N'Metformin 500mg', N'1 viên', N'Sau ăn sáng và tối', '2026-11-01', N'Uống ngay sau khi ăn no', 1);

-- 5.16 SEED LỊCH TRỰC NHÂN VIÊN & PHÂN CÔNG
INSERT INTO dbo.StaffSchedules (StaffId, WorkDate, IsWorking, Note) VALUES
(3, CAST(GETUTCDATE() AS DATE), 1, N'Ca trực chính ban ngày (07:00 - 17:00)');

SET IDENTITY_INSERT dbo.DailySchedulePlans ON;
INSERT INTO dbo.DailySchedulePlans (PlanId, CenterId, PlanDate, Status, TotalStaff, TotalElderly, ConfirmedBy, ConfirmedAt, Notes) VALUES
(1, 1, CAST(GETUTCDATE() AS DATE), N'Confirmed', 4, 5, 2, GETUTCDATE(), N'Kế hoạch vận hành ngày chuẩn');
SET IDENTITY_INSERT dbo.DailySchedulePlans OFF;

INSERT INTO dbo.StaffCareAssignments (PlanId, StaffId, ElderlyId, Notes) VALUES
(1, 3, 1, N'Phụ trách chăm sóc thường quy và nhắc thuốc cho cụ Nguyễn Văn An'),
(1, 3, 2, N'Hỗ trợ di chuyển và giám sát vận động cho cụ Trần Thị Bình');
PRINT N'-> Đã seed Điểm danh, Nhật ký chăm sóc, Kế hoạch thuốc và Phân công nhân viên.';

-- ===================================================================================
-- 6. HOÀN TẤT & TỔNG KẾT
-- ===================================================================================
PRINT N'===================================================================================';
PRINT N'ĐÃ TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU DAYCAREELDERLYDB VÀ SEED DỮ LIỆU FULL 100% THÀNH CÔNG!';
PRINT N'Tài khoản đăng nhập sẵn có (Mật khẩu: 123456):';
PRINT N' 1. Quản trị viên: admin@daycare.com';
PRINT N' 2. Quản lý trung tâm: center_test@daycare.com';
PRINT N' 3. Nhân viên / Y tá: staff_test@daycare.com';
PRINT N' 4. Thân nhân gia đình: family_test@daycare.com';
PRINT N'===================================================================================';
GO
