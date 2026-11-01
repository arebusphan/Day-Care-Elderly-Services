USE DayCareElderlyDB;
GO

-- 1. Drop all existing foreign key constraints
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + 
               N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
FROM sys.foreign_keys;
IF @sql <> N'' EXEC sp_executesql @sql;

-- 2. Drop all tables
SET @sql = N'';
SELECT @sql += N'DROP TABLE ' + QUOTENAME(TABLE_SCHEMA) + N'.' + QUOTENAME(TABLE_NAME) + N';' + CHAR(13)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '__EFMigrationsHistory';
IF @sql <> N'' EXEC sp_executesql @sql;
GO

-- 3. Create Tables with INT IDENTITY(1,1) Primary Keys

-- Roles
CREATE TABLE Roles (
    RoleId INT IDENTITY(1,1) NOT NULL,
    RoleName NVARCHAR(50) NOT NULL,
    Description NVARCHAR(255) NULL,
    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
);

-- Users
CREATE TABLE Users (
    UserId INT IDENTITY(1,1) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(0) NULL,
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);

-- UserRoles
CREATE TABLE UserRoles (
    UserId INT NOT NULL,
    RoleId INT NOT NULL,
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Roles(RoleId) ON DELETE CASCADE
);

-- Centers
CREATE TABLE Centers (
    CenterId INT IDENTITY(1,1) NOT NULL,
    CenterName NVARCHAR(150) NOT NULL,
    Address NVARCHAR(255) NULL,
    PhoneNumber NVARCHAR(20) NULL,
    Email NVARCHAR(100) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Centers_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Centers_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Centers PRIMARY KEY (CenterId)
);

-- FamilyMembers
CREATE TABLE FamilyMembers (
    FamilyMemberId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    Address NVARCHAR(255) NULL,
    EmergencyContact NVARCHAR(100) NULL,
    RelationshipToElderly NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_FamilyMembers_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_FamilyMembers PRIMARY KEY (FamilyMemberId),
    CONSTRAINT FK_FamilyMembers_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UQ_FamilyMembers_UserId UNIQUE (UserId)
);

-- ElderlyMembers
CREATE TABLE ElderlyMembers (
    ElderlyId INT IDENTITY(1,1) NOT NULL,
    CenterId INT NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE NULL,
    Gender NVARCHAR(10) NULL,
    Address NVARCHAR(255) NULL,
    Relationship NVARCHAR(50) NULL,
    EmergencyContactName NVARCHAR(100) NULL,
    EmergencyContactPhone NVARCHAR(20) NULL,
    Allergies NVARCHAR(1000) NULL,
    MedicalHistory NVARCHAR(1000) NULL,
    MedicalNotes NVARCHAR(1000) NULL,
    MobilityStatus NVARCHAR(50) NOT NULL CONSTRAINT DF_ElderlyMembers_MobilityStatus DEFAULT 'Normal',
    CareNotes NVARCHAR(1000) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ElderlyMembers_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ElderlyMembers_CreatedAt DEFAULT SYSDATETIME(),
    UpdatedAt DATETIME2(0) NULL,
    CONSTRAINT PK_ElderlyMembers PRIMARY KEY (ElderlyId),
    CONSTRAINT FK_ElderlyMembers_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId),
    CONSTRAINT CK_ElderlyMembers_Gender CHECK (Gender IN ('Male', 'Female', 'Other', N'Nam', N'Nữ', N'Khác'))
);

-- ElderlyFamilyRelationships
CREATE TABLE ElderlyFamilyRelationships (
    RelationshipId INT IDENTITY(1,1) NOT NULL,
    ElderlyId INT NOT NULL,
    FamilyMemberId INT NOT NULL,
    RelationshipType NVARCHAR(50) NULL,
    IsPrimaryContact BIT NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_IsPrimary DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ElderlyFamilyRelationships_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ElderlyFamilyRelationships PRIMARY KEY (RelationshipId),
    CONSTRAINT FK_ElderlyFamilyRelationships_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId) ON DELETE CASCADE,
    CONSTRAINT FK_ElderlyFamilyRelationships_Family FOREIGN KEY (FamilyMemberId) REFERENCES FamilyMembers(FamilyMemberId) ON DELETE CASCADE,
    CONSTRAINT UQ_ElderlyFamilyRelationships UNIQUE (ElderlyId, FamilyMemberId)
);

-- ServicePackages
CREATE TABLE ServicePackages (
    PackageId INT IDENTITY(1,1) NOT NULL,
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
    CONSTRAINT PK_ServicePackages PRIMARY KEY (PackageId),
    CONSTRAINT FK_ServicePackages_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId)
);

-- ServiceRegistrations
CREATE TABLE ServiceRegistrations (
    RegistrationId INT IDENTITY(1,1) NOT NULL,
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
    CONSTRAINT PK_ServiceRegistrations PRIMARY KEY (RegistrationId),
    CONSTRAINT FK_ServiceRegistrations_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId),
    CONSTRAINT FK_ServiceRegistrations_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT FK_ServiceRegistrations_Packages FOREIGN KEY (PackageId) REFERENCES ServicePackages(PackageId),
    CONSTRAINT FK_ServiceRegistrations_FamilyMembers FOREIGN KEY (FamilyMemberId) REFERENCES FamilyMembers(FamilyMemberId)
);

-- Payments
CREATE TABLE Payments (
    PaymentId INT IDENTITY(1,1) NOT NULL,
    RegistrationId INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    PaymentDate DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_PaymentDate DEFAULT SYSDATETIME(),
    PaymentMethod NVARCHAR(100) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT 'Completed',
    TransactionReference NVARCHAR(100) NULL,
    InvoiceNo NVARCHAR(50) NULL,
    InvoiceVatNo NVARCHAR(50) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Payments PRIMARY KEY (PaymentId),
    CONSTRAINT FK_Payments_ServiceRegistrations FOREIGN KEY (RegistrationId) REFERENCES ServiceRegistrations(RegistrationId) ON DELETE CASCADE
);

-- DailySchedulePlans
CREATE TABLE DailySchedulePlans (
    PlanId INT IDENTITY(1,1) NOT NULL,
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
    CONSTRAINT PK_DailySchedulePlans PRIMARY KEY (PlanId),
    CONSTRAINT FK_DailySchedulePlans_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId),
    CONSTRAINT FK_DailySchedulePlans_Users FOREIGN KEY (ConfirmedBy) REFERENCES Users(UserId),
    CONSTRAINT UQ_DailySchedulePlans_Center_Date UNIQUE (CenterId, PlanDate)
);

-- DailyCareGroups
CREATE TABLE DailyCareGroups (
    GroupId INT IDENTITY(1,1) NOT NULL,
    PlanId INT NOT NULL,
    GroupName NVARCHAR(100) NOT NULL,
    GroupType NVARCHAR(20) NOT NULL CONSTRAINT DF_DailyCareGroups_GroupType DEFAULT 'Normal',
    StaffId INT NULL,
    MaxNormalCapacity INT NOT NULL CONSTRAINT DF_DailyCareGroups_MaxNormal DEFAULT 10,
    MaxSupportCapacity INT NOT NULL CONSTRAINT DF_DailyCareGroups_MaxSupport DEFAULT 4,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DailyCareGroups_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_DailyCareGroups PRIMARY KEY (GroupId),
    CONSTRAINT FK_DailyCareGroups_Plans FOREIGN KEY (PlanId) REFERENCES DailySchedulePlans(PlanId) ON DELETE CASCADE,
    CONSTRAINT FK_DailyCareGroups_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId)
);

-- CareGroupMembers
CREATE TABLE CareGroupMembers (
    GroupMemberId INT IDENTITY(1,1) NOT NULL,
    GroupId INT NOT NULL,
    ElderlyId INT NOT NULL,
    AssignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareGroupMembers_AssignedAt DEFAULT SYSDATETIME(),
    Notes NVARCHAR(500) NULL,
    CONSTRAINT PK_CareGroupMembers PRIMARY KEY (GroupMemberId),
    CONSTRAINT FK_CareGroupMembers_Groups FOREIGN KEY (GroupId) REFERENCES DailyCareGroups(GroupId) ON DELETE CASCADE,
    CONSTRAINT FK_CareGroupMembers_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT UQ_CareGroupMembers_Group_Elderly UNIQUE (GroupId, ElderlyId)
);

-- StaffCareAssignments
CREATE TABLE StaffCareAssignments (
    AssignmentId INT IDENTITY(1,1) NOT NULL,
    PlanId INT NOT NULL,
    StaffId INT NOT NULL,
    ElderlyId INT NOT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffCareAssignments_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_StaffCareAssignments PRIMARY KEY (AssignmentId),
    CONSTRAINT FK_StaffCareAssignments_Plans FOREIGN KEY (PlanId) REFERENCES DailySchedulePlans(PlanId) ON DELETE CASCADE,
    CONSTRAINT FK_StaffCareAssignments_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId),
    CONSTRAINT FK_StaffCareAssignments_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT UQ_StaffCareAssignments_Plan_Elderly UNIQUE (PlanId, ElderlyId)
);

-- StaffSchedules
CREATE TABLE StaffSchedules (
    ScheduleId INT IDENTITY(1,1) NOT NULL,
    StaffId INT NOT NULL,
    WorkDate DATE NOT NULL,
    IsWorking BIT NOT NULL CONSTRAINT DF_StaffSchedules_IsWorking DEFAULT 1,
    Note NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffSchedules_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_StaffSchedules PRIMARY KEY (ScheduleId),
    CONSTRAINT FK_StaffSchedules_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId) ON DELETE CASCADE,
    CONSTRAINT UQ_StaffSchedules_Staff_Date UNIQUE (StaffId, WorkDate)
);

-- ActivityTemplates
CREATE TABLE ActivityTemplates (
    ActivityTemplateId INT IDENTITY(1,1) NOT NULL,
    CenterId INT NOT NULL,
    ActivityName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    DefaultStartTime TIME(0) NULL,
    DefaultEndTime TIME(0) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_ActivityTemplates_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ActivityTemplates_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ActivityTemplates PRIMARY KEY (ActivityTemplateId),
    CONSTRAINT FK_ActivityTemplates_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId)
);

-- CenterActivities
CREATE TABLE CenterActivities (
    CenterActivityId INT IDENTITY(1,1) NOT NULL,
    CenterId INT NOT NULL,
    ActivityTemplateId INT NULL,
    ActivityDate DATE NOT NULL,
    ActivityName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    StartTime TIME(0) NULL,
    EndTime TIME(0) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_CenterActivities_Status DEFAULT 'Scheduled',
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CenterActivities_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_CenterActivities PRIMARY KEY (CenterActivityId),
    CONSTRAINT FK_CenterActivities_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId),
    CONSTRAINT FK_CenterActivities_ActivityTemplates FOREIGN KEY (ActivityTemplateId) REFERENCES ActivityTemplates(ActivityTemplateId),
    CONSTRAINT FK_CenterActivities_Users FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
);

-- ActivityAssignments
CREATE TABLE ActivityAssignments (
    AssignmentId INT IDENTITY(1,1) NOT NULL,
    CenterActivityId INT NOT NULL,
    StaffId INT NOT NULL,
    AssignedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ActivityAssignments_AssignedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ActivityAssignments PRIMARY KEY (AssignmentId),
    CONSTRAINT FK_ActivityAssignments_Activities FOREIGN KEY (CenterActivityId) REFERENCES CenterActivities(CenterActivityId) ON DELETE CASCADE,
    CONSTRAINT FK_ActivityAssignments_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId),
    CONSTRAINT UQ_ActivityAssignments_ActivityStaff UNIQUE (CenterActivityId, StaffId)
);

-- PackageActivities
CREATE TABLE PackageActivities (
    PackageActivityId INT IDENTITY(1,1) NOT NULL,
    PackageId INT NOT NULL,
    ActivityTemplateId INT NOT NULL,
    DayOfWeek INT NULL,
    CONSTRAINT PK_PackageActivities PRIMARY KEY (PackageActivityId),
    CONSTRAINT FK_PackageActivities_Packages FOREIGN KEY (PackageId) REFERENCES ServicePackages(PackageId) ON DELETE CASCADE,
    CONSTRAINT FK_PackageActivities_Templates FOREIGN KEY (ActivityTemplateId) REFERENCES ActivityTemplates(ActivityTemplateId) ON DELETE CASCADE
);

-- AttendanceRecords
CREATE TABLE AttendanceRecords (
    AttendanceId INT IDENTITY(1,1) NOT NULL,
    ElderlyId INT NOT NULL,
    RegistrationId INT NULL,
    AttendanceDate DATE NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_AttendanceRecords_Status DEFAULT 'Present',
    CheckInTime TIME(0) NULL,
    CheckOutTime TIME(0) NULL,
    CheckedInBy INT NULL,
    CheckedOutBy INT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AttendanceRecords_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_AttendanceRecords PRIMARY KEY (AttendanceId),
    CONSTRAINT FK_AttendanceRecords_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT FK_AttendanceRecords_Registrations FOREIGN KEY (RegistrationId) REFERENCES ServiceRegistrations(RegistrationId),
    CONSTRAINT FK_AttendanceRecords_CheckedIn FOREIGN KEY (CheckedInBy) REFERENCES Users(UserId),
    CONSTRAINT FK_AttendanceRecords_CheckedOut FOREIGN KEY (CheckedOutBy) REFERENCES Users(UserId)
);

-- CareLogs
CREATE TABLE CareLogs (
    CareLogId INT IDENTITY(1,1) NOT NULL,
    ElderlyId INT NOT NULL,
    StaffId INT NOT NULL,
    CareDate DATE NOT NULL,
    CareType NVARCHAR(50) NOT NULL,
    Description NVARCHAR(1000) NULL,
    Notes NVARCHAR(500) NULL,
    Data NVARCHAR(MAX) NULL,
    IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogs_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_CareLogs PRIMARY KEY (CareLogId),
    CONSTRAINT FK_CareLogs_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT FK_CareLogs_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId)
);

-- CareLogPhotos
CREATE TABLE CareLogPhotos (
    CareLogPhotoId INT IDENTITY(1,1) NOT NULL,
    CareLogId INT NOT NULL,
    FileUrl NVARCHAR(1000) NOT NULL,
    UploadedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogPhotos_UploadedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_CareLogPhotos PRIMARY KEY (CareLogPhotoId),
    CONSTRAINT FK_CareLogPhotos_CareLogs FOREIGN KEY (CareLogId) REFERENCES CareLogs(CareLogId) ON DELETE CASCADE
);

-- IncidentReports
CREATE TABLE IncidentReports (
    IncidentId INT IDENTITY(1,1) NOT NULL,
    ElderlyId INT NOT NULL,
    ReportedBy INT NOT NULL,
    IncidentDate DATETIME2(0) NOT NULL,
    Severity NVARCHAR(30) NOT NULL,
    Description NVARCHAR(1000) NOT NULL,
    ActionTaken NVARCHAR(1000) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_IncidentReports_Status DEFAULT 'Reported',
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_IncidentReports_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_IncidentReports PRIMARY KEY (IncidentId),
    CONSTRAINT FK_IncidentReports_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
    CONSTRAINT FK_IncidentReports_Users FOREIGN KEY (ReportedBy) REFERENCES Users(UserId)
);

-- MedicalSupplies
CREATE TABLE MedicalSupplies (
    SupplyId INT IDENTITY(1,1) NOT NULL,
    CenterId INT NOT NULL,
    SupplyName NVARCHAR(100) NOT NULL,
    Category NVARCHAR(50) NULL,
    QuantityInStock INT NOT NULL CONSTRAINT DF_MedicalSupplies_Quantity DEFAULT 0,
    Unit NVARCHAR(20) NOT NULL,
    ReorderLevel INT NOT NULL CONSTRAINT DF_MedicalSupplies_Reorder DEFAULT 10,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicalSupplies_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_MedicalSupplies PRIMARY KEY (SupplyId),
    CONSTRAINT FK_MedicalSupplies_Centers FOREIGN KEY (CenterId) REFERENCES Centers(CenterId)
);

-- SupplyTransactions
CREATE TABLE SupplyTransactions (
    SupplyTransactionId INT IDENTITY(1,1) NOT NULL,
    SupplyId INT NOT NULL,
    TransactionType NVARCHAR(30) NOT NULL,
    Quantity INT NOT NULL,
    TransactionDate DATETIME2(0) NOT NULL CONSTRAINT DF_SupplyTransactions_Date DEFAULT SYSDATETIME(),
    RecordedBy INT NOT NULL,
    Notes NVARCHAR(500) NULL,
    CONSTRAINT PK_SupplyTransactions PRIMARY KEY (SupplyTransactionId),
    CONSTRAINT FK_SupplyTransactions_Supplies FOREIGN KEY (SupplyId) REFERENCES MedicalSupplies(SupplyId),
    CONSTRAINT FK_SupplyTransactions_Users FOREIGN KEY (RecordedBy) REFERENCES Users(UserId)
);

-- MedicationPlans
CREATE TABLE MedicationPlans (
    MedicationPlanId INT IDENTITY(1,1) NOT NULL,
    ElderlyId INT NOT NULL,
    MedicationName NVARCHAR(100) NOT NULL,
    Dosage NVARCHAR(50) NOT NULL,
    Frequency NVARCHAR(50) NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NULL,
    Instructions NVARCHAR(500) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_MedicationPlans_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicationPlans_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_MedicationPlans PRIMARY KEY (MedicationPlanId),
    CONSTRAINT FK_MedicationPlans_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId)
);

-- MedicationRecords
CREATE TABLE MedicationRecords (
    MedicationRecordId INT IDENTITY(1,1) NOT NULL,
    MedicationPlanId INT NOT NULL,
    AdministeredDate DATE NOT NULL,
    AdministeredTime TIME(0) NOT NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_MedicationRecords_Status DEFAULT 'Scheduled',
    StaffId INT NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_MedicationRecords_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_MedicationRecords PRIMARY KEY (MedicationRecordId),
    CONSTRAINT FK_MedicationRecords_Plans FOREIGN KEY (MedicationPlanId) REFERENCES MedicationPlans(MedicationPlanId),
    CONSTRAINT FK_MedicationRecords_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId)
);

-- Notifications
CREATE TABLE Notifications (
    NotificationId INT IDENTITY(1,1) NOT NULL,
    UserId INT NOT NULL,
    Title NVARCHAR(150) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    NotificationType NVARCHAR(50) NOT NULL CONSTRAINT DF_Notifications_Type DEFAULT 'General',
    RelatedEntityType NVARCHAR(50) NULL,
    RelatedEntityId INT NULL,
    IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSDATETIME(),
    CONSTRAINT PK_Notifications PRIMARY KEY (NotificationId),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES Users(UserId) ON DELETE CASCADE
);
GO

