using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.Security;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.API.Data;

public static class DbInitializer
{
    public static async Task SeedDefaultDataAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var logger = scope.ServiceProvider.GetService<ILogger<AppDbContext>>();

        try
        {
            // 1. Đồng bộ các cột mới của bảng ElderlyMembers
            var syncElderlySql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ElderlyMembers')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'EmergencyContactName')
                        ALTER TABLE ElderlyMembers ADD EmergencyContactName NVARCHAR(100) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'EmergencyContactPhone')
                        ALTER TABLE ElderlyMembers ADD EmergencyContactPhone NVARCHAR(20) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'Allergies')
                        ALTER TABLE ElderlyMembers ADD Allergies NVARCHAR(1000) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'MedicalHistory')
                        ALTER TABLE ElderlyMembers ADD MedicalHistory NVARCHAR(1000) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'MobilityStatus')
                        ALTER TABLE ElderlyMembers ADD MobilityStatus NVARCHAR(50) NULL DEFAULT 'Normal';

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'CareNotes')
                        ALTER TABLE ElderlyMembers ADD CareNotes NVARCHAR(1000) NULL;

                    -- Nới lỏng CHECK constraint Gender
                    IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_ElderlyMembers_Gender')
                    BEGIN
                        ALTER TABLE ElderlyMembers DROP CONSTRAINT CK_ElderlyMembers_Gender;
                        ALTER TABLE ElderlyMembers ADD CONSTRAINT CK_ElderlyMembers_Gender CHECK (Gender IN ('Male', 'Female', 'Other'));
                    END
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncElderlySql);

            // 2. Đồng bộ các cột cho ServicePackages, ServiceRegistrations, Payments
            var syncPackagesSql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServicePackages')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'PricePerDay')
                        ALTER TABLE ServicePackages ADD PricePerDay DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'PriceMonth3Days')
                        ALTER TABLE ServicePackages ADD PriceMonth3Days DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'PriceMonthFullWeek')
                        ALTER TABLE ServicePackages ADD PriceMonthFullWeek DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'Highlights')
                        ALTER TABLE ServicePackages ADD Highlights NVARCHAR(2000) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'IncludedServices')
                        ALTER TABLE ServicePackages ADD IncludedServices NVARCHAR(2000) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'TargetAudience')
                        ALTER TABLE ServicePackages ADD TargetAudience NVARCHAR(500) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'PricingNote')
                        ALTER TABLE ServicePackages ADD PricingNote NVARCHAR(500) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'TotalSlots')
                        ALTER TABLE ServicePackages ADD TotalSlots INT NOT NULL DEFAULT 20;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServicePackages' AND COLUMN_NAME = 'EndOfLifeRoomIncluded')
                        ALTER TABLE ServicePackages ADD EndOfLifeRoomIncluded BIT NOT NULL DEFAULT 0;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServiceRegistrations')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'RegistrationCode')
                        ALTER TABLE ServiceRegistrations ADD RegistrationCode NVARCHAR(50) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'RegistrationType')
                        ALTER TABLE ServiceRegistrations ADD RegistrationType NVARCHAR(30) NOT NULL DEFAULT 'monthly';

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'MonthlyPattern')
                        ALTER TABLE ServiceRegistrations ADD MonthlyPattern NVARCHAR(30) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'RoomType')
                        ALTER TABLE ServiceRegistrations ADD RoomType NVARCHAR(30) NOT NULL DEFAULT 'large';

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'TotalDays')
                        ALTER TABLE ServiceRegistrations ADD TotalDays INT NOT NULL DEFAULT 1;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'SupportSurcharge')
                        ALTER TABLE ServiceRegistrations ADD SupportSurcharge DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'RoomSurcharge')
                        ALTER TABLE ServiceRegistrations ADD RoomSurcharge DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'TotalAmount')
                        ALTER TABLE ServiceRegistrations ADD TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'SelectedDatesJson')
                        ALTER TABLE ServiceRegistrations ADD SelectedDatesJson NVARCHAR(4000) NULL;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Payments')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payments' AND COLUMN_NAME = 'InvoiceNo')
                        ALTER TABLE Payments ADD InvoiceNo NVARCHAR(50) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payments' AND COLUMN_NAME = 'InvoiceVatNo')
                        ALTER TABLE Payments ADD InvoiceVatNo NVARCHAR(50) NULL;

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payments' AND COLUMN_NAME = 'PaymentMethod' AND CHARACTER_MAXIMUM_LENGTH < 100)
                        ALTER TABLE Payments ALTER COLUMN PaymentMethod NVARCHAR(100) NOT NULL;
                END

                -- Cho phép EndDate nhận NULL cho các gói đăng ký linh hoạt
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'EndDate' AND IS_NULLABLE = 'NO')
                    ALTER TABLE ServiceRegistrations ALTER COLUMN EndDate DATE NULL;

                -- Gỡ bỏ các CHECK constraint cũ trên Payments và ServiceRegistrations
                DECLARE @dropCheckSql NVARCHAR(MAX) = N'';
                SELECT @dropCheckSql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(name) + N'; '
                FROM sys.check_constraints
                WHERE parent_object_id IN (OBJECT_ID('Payments'), OBJECT_ID('ServiceRegistrations'));
                IF @dropCheckSql <> N''
                    EXEC sp_executesql @dropCheckSql;
            ";
            await context.Database.ExecuteSqlRawAsync(syncPackagesSql);
            logger?.LogInformation("Đã đồng bộ cấu trúc bảng ServicePackages, ServiceRegistrations, Payments.");

            // 2.5. Đồng bộ bảng StaffSchedules, DailySchedulePlans, StaffCareAssignments (INT identity)
            var syncStaffSql = @"
                -- Tạo bảng StaffSchedules nếu chưa có
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffSchedules')
                BEGIN
                    CREATE TABLE StaffSchedules (
                        ScheduleId INT IDENTITY(1,1) NOT NULL,
                        StaffId INT NOT NULL,
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

                -- Tạo bảng DailySchedulePlans nếu chưa có
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DailySchedulePlans')
                BEGIN
                    CREATE TABLE DailySchedulePlans (
                        PlanId INT IDENTITY(1,1) NOT NULL,
                        PlanDate DATE NOT NULL,
                        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_DailySchedulePlans_Status DEFAULT ('Draft'),
                        ConfirmedAt DATETIME2(0) NULL,
                        ConfirmedBy INT NULL,
                        TotalStaff INT NOT NULL DEFAULT 0,
                        TotalElderly INT NOT NULL DEFAULT 0,
                        Notes NVARCHAR(1000) NULL,
                        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_DailySchedulePlans_CreatedAt DEFAULT (SYSDATETIME()),
                        UpdatedAt DATETIME2(0) NULL,
                        CONSTRAINT PK_DailySchedulePlans PRIMARY KEY (PlanId),
                        CONSTRAINT FK_DailySchedulePlans_Users FOREIGN KEY (ConfirmedBy) REFERENCES Users(UserId),
                        CONSTRAINT UQ_DailySchedulePlans_Date UNIQUE (PlanDate)
                    );
                    CREATE INDEX IX_DailySchedulePlans_PlanDate ON DailySchedulePlans(PlanDate);
                END

                -- Tạo bảng StaffCareAssignments nếu chưa có
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffCareAssignments')
                BEGIN
                    CREATE TABLE StaffCareAssignments (
                        AssignmentId INT IDENTITY(1,1) NOT NULL,
                        PlanId INT NOT NULL,
                        StaffId INT NOT NULL,
                        ElderlyId INT NOT NULL,
                        Notes NVARCHAR(500) NULL,
                        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_StaffCareAssignments_CreatedAt DEFAULT (SYSDATETIME()),
                        CONSTRAINT PK_StaffCareAssignments PRIMARY KEY (AssignmentId),
                        CONSTRAINT FK_StaffCareAssignments_Plans FOREIGN KEY (PlanId) REFERENCES DailySchedulePlans(PlanId) ON DELETE CASCADE,
                        CONSTRAINT FK_StaffCareAssignments_Users FOREIGN KEY (StaffId) REFERENCES Users(UserId),
                        CONSTRAINT FK_StaffCareAssignments_Elderly FOREIGN KEY (ElderlyId) REFERENCES ElderlyMembers(ElderlyId),
                        CONSTRAINT UQ_StaffCareAssignments_Plan_Elderly UNIQUE (PlanId, ElderlyId)
                    );
                    CREATE INDEX IX_StaffCareAssignments_Plan_Staff ON StaffCareAssignments(PlanId, StaffId);
                END

                -- Dọn dẹp bảng StaffLeaves nếu còn tồn tại
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StaffLeaves')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_StaffLeaves_Users')
                        ALTER TABLE StaffLeaves DROP CONSTRAINT FK_StaffLeaves_Users;
                    DROP TABLE StaffLeaves;
                END

                -- Dọn dẹp bảng StaffShifts nếu còn tồn tại
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

                -- Dọn dẹp bảng Staff cũ nếu còn tồn tại
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Staff')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Staff_Centers')
                        ALTER TABLE Staff DROP CONSTRAINT FK_Staff_Centers;
                    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Staff_Users')
                        ALTER TABLE Staff DROP CONSTRAINT FK_Staff_Users;
                    DROP TABLE Staff;
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncStaffSql);
            logger?.LogInformation("Đã đồng bộ bảng StaffSchedules, DailySchedulePlans, StaffCareAssignments.");

            // 2.6. Đồng bộ CareLogs và tạo bảng CareLogPhotos
            var syncCareLogsSql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
                        ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
                        ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogPhotos')
                BEGIN
                    CREATE TABLE CareLogPhotos (
                        CareLogPhotoId INT IDENTITY(1,1) NOT NULL,
                        CareLogId INT NOT NULL,
                        FileUrl NVARCHAR(1000) NOT NULL,
                        UploadedAt DATETIME2(0) NOT NULL CONSTRAINT DF_CareLogPhotos_UploadedAt DEFAULT (SYSDATETIME()),
                        CONSTRAINT PK_CareLogPhotos PRIMARY KEY (CareLogPhotoId),
                        CONSTRAINT FK_CareLogPhotos_CareLogs FOREIGN KEY (CareLogId) REFERENCES CareLogs(CareLogId) ON DELETE CASCADE
                    );
                    CREATE INDEX IX_CareLogPhotos_CareLogId ON CareLogPhotos(CareLogId);
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncCareLogsSql);
                        logger?.LogInformation("Đã đồng bộ bảng CareLogs, CareLogPhotos.");

            // 2.7. Đồng bộ IncidentReports, MedicalSupplies, ElderlyMembers
            var syncIncidentsAndSuppliesSql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ElderlyMembers')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'EmergencyNotes')
                        ALTER TABLE ElderlyMembers ADD EmergencyNotes NVARCHAR(1000) NULL;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IncidentReports')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IncidentType')
                        ALTER TABLE IncidentReports ADD IncidentType NVARCHAR(100) NOT NULL CONSTRAINT DF_IncidentReports_IncidentType DEFAULT N'Chung';

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'OccurredAt')
                        ALTER TABLE IncidentReports ADD OccurredAt DATETIME2(0) NOT NULL CONSTRAINT DF_IncidentReports_OccurredAt DEFAULT SYSDATETIME();

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ReportedAt')
                        ALTER TABLE IncidentReports ADD ReportedAt DATETIME2(0) NOT NULL CONSTRAINT DF_IncidentReports_ReportedAt DEFAULT SYSDATETIME();

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ResolutionNotes')
                        ALTER TABLE IncidentReports ADD ResolutionNotes NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'ResolvedAt')
                        ALTER TABLE IncidentReports ADD ResolvedAt DATETIME2(0) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IsSupplyConfirmed')
                        ALTER TABLE IncidentReports ADD IsSupplyConfirmed BIT NOT NULL CONSTRAINT DF_IncidentReports_IsSupplyConfirmed DEFAULT 0;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicalSupplies')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'MinimumStock')
                        ALTER TABLE MedicalSupplies ADD MinimumStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_MinimumStock DEFAULT 0;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'IsActive')
                        ALTER TABLE MedicalSupplies ADD IsActive BIT NOT NULL CONSTRAINT DF_MedicalSupplies_IsActive DEFAULT 1;

                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'QuantityInStock' AND DATA_TYPE = 'int')
                    BEGIN
                        DECLARE @defConstraint NVARCHAR(200);
                        SELECT @defConstraint = d.name 
                        FROM sys.default_constraints d 
                        JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
                        WHERE c.object_id = OBJECT_ID('MedicalSupplies') AND c.name = 'QuantityInStock';
                        
                        IF @defConstraint IS NOT NULL
                            EXEC('ALTER TABLE MedicalSupplies DROP CONSTRAINT ' + @defConstraint);

                        ALTER TABLE MedicalSupplies ALTER COLUMN QuantityInStock DECIMAL(18,2) NOT NULL;
                        ALTER TABLE MedicalSupplies ADD CONSTRAINT DF_MedicalSupplies_QuantityInStock DEFAULT 0 FOR QuantityInStock;
                    END
                    ELSE IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'QuantityInStock')
                    BEGIN
                        ALTER TABLE MedicalSupplies ADD QuantityInStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_QuantityInStock DEFAULT 0;
                    END
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncIncidentsAndSuppliesSql);
            logger?.LogInformation("Đã đồng bộ IncidentReports (IsSupplyConfirmed, IncidentType, OccurredAt, ReportedAt, ResolutionNotes, ResolvedAt) và MedicalSupplies (QuantityInStock, MinimumStock, IsActive).");

            // 3. Seed Roles
            var defaultRoles = new List<Role>
            {
                new() { RoleName = "Admin",        Description = "Quản trị viên toàn quyền hệ thống" },
                new() { RoleName = "Staff",        Description = "Nhân viên chăm sóc và điều dưỡng" },
                new() { RoleName = "FamilyMember", Description = "Thành viên gia đình của người cao tuổi" }
            };

            foreach (var role in defaultRoles)
            {
                if (!await context.Roles.AnyAsync(r => r.RoleName == role.RoleName))
                    await context.Roles.AddAsync(role);
            }
            await context.SaveChangesAsync();

            // 5. Seed Default Admin User
            var adminEmail = "admin@daycare.com";
            if (!await context.Users.AnyAsync(u => u.Email == adminEmail))
            {
                var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");
                var adminUser = new User
                {
                    Email        = adminEmail,
                    PasswordHash = passwordHasher.HashPassword("Admin@123456"),
                    FullName     = "Hệ Thống Quản Trị Viên",
                    PhoneNumber  = "0901234567",
                    IsActive     = true,
                    CreatedAt    = DateTime.UtcNow
                };
                if (adminRole != null)
                    adminUser.Roles.Add(adminRole);

                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
                logger?.LogInformation("Tài khoản Admin mặc định (admin@daycare.com / Admin@123456) đã được tạo.");
            }

            // 5.5. Bridge schema live DB (CenterId / EFR / PriceAtPurchase) — không tạo bảng mới
            var syncCenterBridgeSql = @"
                IF OBJECT_ID(N'dbo.Centers', N'U') IS NOT NULL
                   AND NOT EXISTS (SELECT 1 FROM Centers)
                BEGIN
                    INSERT INTO Centers (CenterName, Address, PhoneNumber, Email, IsActive, CreatedAt)
                    VALUES (N'Day Care Demo Center', N'Hà Nội', N'0900000000', N'center@daycare.com', 1, SYSDATETIME());
                END

                DECLARE @CenterId INT = (SELECT TOP 1 CenterId FROM Centers ORDER BY CenterId);
                DECLARE @sql NVARCHAR(500);

                IF @CenterId IS NOT NULL
                BEGIN
                    IF COL_LENGTH('ServicePackages', 'CenterId') IS NOT NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM sys.default_constraints dc
                           JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                           WHERE c.object_id = OBJECT_ID('ServicePackages') AND c.name = 'CenterId')
                    BEGIN
                        SET @sql = N'ALTER TABLE ServicePackages ADD CONSTRAINT DF_ServicePackages_CenterId DEFAULT ('
                                 + CAST(@CenterId AS NVARCHAR(10)) + N') FOR CenterId';
                        EXEC sp_executesql @sql;
                    END

                    IF COL_LENGTH('ElderlyMembers', 'CenterId') IS NOT NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM sys.default_constraints dc
                           JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                           WHERE c.object_id = OBJECT_ID('ElderlyMembers') AND c.name = 'CenterId')
                    BEGIN
                        SET @sql = N'ALTER TABLE ElderlyMembers ADD CONSTRAINT DF_ElderlyMembers_CenterId DEFAULT ('
                                 + CAST(@CenterId AS NVARCHAR(10)) + N') FOR CenterId';
                        EXEC sp_executesql @sql;
                    END

                    IF COL_LENGTH('ServiceRegistrations', 'CenterId') IS NOT NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM sys.default_constraints dc
                           JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                           WHERE c.object_id = OBJECT_ID('ServiceRegistrations') AND c.name = 'CenterId')
                    BEGIN
                        SET @sql = N'ALTER TABLE ServiceRegistrations ADD CONSTRAINT DF_ServiceRegistrations_CenterId DEFAULT ('
                                 + CAST(@CenterId AS NVARCHAR(10)) + N') FOR CenterId';
                        EXEC sp_executesql @sql;
                    END

                    IF COL_LENGTH('DailySchedulePlans', 'CenterId') IS NOT NULL
                       AND NOT EXISTS (
                           SELECT 1 FROM sys.default_constraints dc
                           JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                           WHERE c.object_id = OBJECT_ID('DailySchedulePlans') AND c.name = 'CenterId')
                    BEGIN
                        SET @sql = N'ALTER TABLE DailySchedulePlans ADD CONSTRAINT DF_DailySchedulePlans_CenterId DEFAULT ('
                                 + CAST(@CenterId AS NVARCHAR(10)) + N') FOR CenterId';
                        EXEC sp_executesql @sql;
                    END
                END

                IF OBJECT_ID(N'dbo.MedicationPlans', N'U') IS NOT NULL
                   AND COL_LENGTH('MedicationPlans', 'Frequency') IS NOT NULL
                   AND NOT EXISTS (
                       SELECT 1 FROM sys.default_constraints dc
                       JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
                       WHERE c.object_id = OBJECT_ID('MedicationPlans') AND c.name = 'Frequency')
                BEGIN
                    ALTER TABLE MedicationPlans ADD CONSTRAINT DF_MedicationPlans_Frequency DEFAULT N'2 lần/ngày' FOR Frequency;
                END

                IF OBJECT_ID(N'dbo.ElderlyFamilyRelationships', N'U') IS NOT NULL
                BEGIN
                    IF COL_LENGTH('ElderlyFamilyRelationships', 'Relationship') IS NULL
                        ALTER TABLE ElderlyFamilyRelationships ADD Relationship NVARCHAR(50) NULL;

                    IF COL_LENGTH('ElderlyFamilyRelationships', 'CanViewCareLogs') IS NULL
                        ALTER TABLE ElderlyFamilyRelationships ADD CanViewCareLogs BIT NOT NULL
                            CONSTRAINT DF_EFR_CanViewCareLogs DEFAULT 1;

                    IF COL_LENGTH('ElderlyFamilyRelationships', 'CanReceiveNotifications') IS NULL
                        ALTER TABLE ElderlyFamilyRelationships ADD CanReceiveNotifications BIT NOT NULL
                            CONSTRAINT DF_EFR_CanReceiveNotifications DEFAULT 1;

                    IF COL_LENGTH('ElderlyFamilyRelationships', 'RelationshipType') IS NOT NULL
                       AND COL_LENGTH('ElderlyFamilyRelationships', 'Relationship') IS NOT NULL
                    BEGIN
                        SET @sql = N'UPDATE ElderlyFamilyRelationships SET Relationship = RelationshipType WHERE Relationship IS NULL AND RelationshipType IS NOT NULL';
                        EXEC sp_executesql @sql;
                    END
                END

                IF OBJECT_ID(N'dbo.ServiceRegistrations', N'U') IS NOT NULL
                   AND COL_LENGTH('ServiceRegistrations', 'PriceAtPurchase') IS NULL
                    ALTER TABLE ServiceRegistrations ADD PriceAtPurchase DECIMAL(18,2) NOT NULL
                        CONSTRAINT DF_ServiceRegistrations_PriceAtPurchase DEFAULT 0;

                IF OBJECT_ID(N'dbo.ElderlyMembers', N'U') IS NOT NULL
                   AND COL_LENGTH('ElderlyMembers', 'ChronicConditions') IS NULL
                    ALTER TABLE ElderlyMembers ADD ChronicConditions NVARCHAR(200) NULL;
            ";
            await context.Database.ExecuteSqlRawAsync(syncCenterBridgeSql);
            logger?.LogInformation("Đã đồng bộ Center mặc định và cột bridge (CenterId/EFR/PriceAtPurchase).");

            // 6. Seed 5 Service Packages (INT identity — upsert by name)
            var packagesToSeed = new List<ServicePackage>
            {
                new()
                {
                    PackageName        = "Cơ bản",
                    Description        = "Dành cho người cao tuổi khỏe mạnh hoặc giảm nhẹ vận động, cần giao lưu và sinh hoạt ban ngày.",
                    Price              = 6000000,
                    BillingPeriod      = "Monthly",
                    PricePerDay        = 300000,
                    PriceMonth3Days    = 3300000,
                    PriceMonthFullWeek = 6000000,
                    Highlights         = "Chăm sóc bán trú 07:00 – 17:00;3 bữa ăn dinh dưỡng đầy đủ;Kiểm tra sức khỏe cơ bản mỗi sáng;Hoạt động thể dục dưỡng sinh, giải trí nhẹ",
                    IncludedServices   = "Bán trú tiêu chuẩn;Bữa sáng, bữa trưa, bữa phụ chiều;Theo dõi chỉ số sinh tồn;Nhật ký theo dõi hàng ngày",
                    TargetAudience     = "Người cao tuổi tự chủ sinh hoạt, cần môi trường giao lưu kết bạn",
                    PricingNote        = "Phụ phí hỗ trợ tăng cường nếu cụ cần hỗ trợ di chuyển.",
                    TotalSlots         = 45,
                    EndOfLifeRoomIncluded = false,
                    IsActive           = true,
                    CreatedAt          = DateTime.UtcNow
                },
                new()
                {
                    PackageName        = "Phục hồi chức năng",
                    Description        = "Dành cho người cao tuổi yếu vận động, sau phẫu thuật xương khớp, cần phục hồi tầm vận động và thể lực.",
                    Price              = 9000000,
                    BillingPeriod      = "Monthly",
                    PricePerDay        = 450000,
                    PriceMonth3Days    = 4950000,
                    PriceMonthFullWeek = 9000000,
                    Highlights         = "Tập vật lý trị liệu 1-kèm-2;Tập dáng đi, thăng bằng và sức cơ;Dụng cụ chuyên dụng và xe đạp trợ lực;Báo cáo tiến triển phục hồi hằng tuần",
                    IncludedServices   = "Toàn bộ quyền lợi Gói Cơ bản;Vật lý trị liệu chuyên biệt 5 buổi/tuần;Dụng cụ tập phục hồi;Bác sĩ PHCN đánh giá tiến độ",
                    TargetAudience     = "Người cao tuổi sau phẫu thuật khớp, sau bó bột hoặc suy giảm cơ lực",
                    PricingNote        = "",
                    TotalSlots         = 20,
                    EndOfLifeRoomIncluded = false,
                    IsActive           = true,
                    CreatedAt          = DateTime.UtcNow
                },
                new()
                {
                    PackageName        = "Sa sút trí tuệ",
                    Description        = "Dành cho người cao tuổi hay quên, lú lẫn, Alzheimer, cần môi trường an toàn và giám sát chuyên biệt.",
                    Price              = 10000000,
                    BillingPeriod      = "Monthly",
                    PricePerDay        = 500000,
                    PriceMonth3Days    = 5500000,
                    PriceMonthFullWeek = 10000000,
                    Highlights         = "Khuôn viên khép kín, an toàn tuyệt đối 24/7;Liệu pháp âm nhạc, mùi hương, gợi nhớ ký ức;Điều dưỡng viên chuyên trách sa sút trí tuệ;Lịch sinh hoạt cố định giúp tâm lý an ổn",
                    IncludedServices   = "Toàn bộ quyền lợi Gói Cơ bản;Điều dưỡng chuyên trách hỗ trợ 1-1;Liệu pháp kích thích nhận thức;Vườn an toàn khép kín",
                    TargetAudience     = "Người cao tuổi mắc bệnh Alzheimer, suy giảm trí nhớ từ nhẹ đến trung bình",
                    PricingNote        = "",
                    TotalSlots         = 15,
                    EndOfLifeRoomIncluded = false,
                    IsActive           = true,
                    CreatedAt          = DateTime.UtcNow
                },
                new()
                {
                    PackageName        = "Sau tai biến",
                    Description        = "Dành cho người cao tuổi có di chứng tai biến mạch máu não, liệt nửa người, rối loạn nuốt hoặc phát âm.",
                    Price              = 11000000,
                    BillingPeriod      = "Monthly",
                    PricePerDay        = 550000,
                    PriceMonth3Days    = 6050000,
                    PriceMonthFullWeek = 11000000,
                    Highlights         = "Tập chống co cứng cơ và phục hồi chức năng vận động;Âm ngữ trị liệu, tập nuốt an toàn;Y học cổ truyền: bấm huyệt, ngâm chân thảo mộc;Theo dõi chỉ số huyết áp, tim mạch liên tục",
                    IncludedServices   = "Toàn bộ quyền lợi Gói Cơ bản;Phục hồi chức năng tai biến chuyên sâu;Âm ngữ trị liệu và tập nuốt;Bấm huyệt thư giãn cơ",
                    TargetAudience     = "Người cao tuổi sau đột quỵ/tai biến dưới 1 năm",
                    PricingNote        = "",
                    TotalSlots         = 12,
                    EndOfLifeRoomIncluded = false,
                    IsActive           = true,
                    CreatedAt          = DateTime.UtcNow
                },
                new()
                {
                    PackageName        = "Giai đoạn cuối",
                    Description        = "Dành cho người cao tuổi cần chăm sóc giảm nhẹ, tạo sự thoải mái tối đa và đồng hành tinh thần những năm tháng cuối đời.",
                    Price              = 14000000,
                    BillingPeriod      = "Monthly",
                    PricePerDay        = 700000,
                    PriceMonth3Days    = 7700000,
                    PriceMonthFullWeek = 14000000,
                    Highlights         = "Phòng VIP 1–2 người yên tĩnh đã bao gồm trọn gói;Chăm sóc giảm nhẹ, xoa bóp lăn trở chống loét từng giờ;Đồng hành tinh thần, kết nối gia đình mọi lúc;Chế độ dinh dưỡng đặc biệt, nấu theo yêu cầu của cụ",
                    IncludedServices   = "Toàn bộ quyền lợi Gói Cơ bản;Phòng VIP 1–2 người riêng tư (đã bao gồm);Chăm sóc giảm đau, giảm nhẹ;Điều dưỡng túc trực 24/7",
                    TargetAudience     = "Người cao tuổi sức khỏe suy kiệt cần chăm sóc an dưỡng thoải mái",
                    PricingNote        = "Lưu ý: Dịch vụ chăm sóc thoải mái, không thay thế cơ sở y tế chuyên khoa.",
                    TotalSlots         = 8,
                    EndOfLifeRoomIncluded = true,
                    IsActive           = true,
                    CreatedAt          = DateTime.UtcNow
                }
            };

            foreach (var pkg in packagesToSeed)
            {
                var existing = await context.ServicePackages
                    .FirstOrDefaultAsync(p => p.PackageName == pkg.PackageName);
                if (existing == null)
                {
                    await context.ServicePackages.AddAsync(pkg);
                }
                else
                {
                    existing.Description        = pkg.Description;
                    existing.Price              = pkg.Price;
                    existing.PricePerDay        = pkg.PricePerDay;
                    existing.PriceMonth3Days    = pkg.PriceMonth3Days;
                    existing.PriceMonthFullWeek = pkg.PriceMonthFullWeek;
                    existing.Highlights         = pkg.Highlights;
                    existing.IncludedServices   = pkg.IncludedServices;
                    existing.TargetAudience     = pkg.TargetAudience;
                    existing.PricingNote        = pkg.PricingNote;
                    existing.TotalSlots         = pkg.TotalSlots;
                    existing.EndOfLifeRoomIncluded = pkg.EndOfLifeRoomIncluded;
                    existing.IsActive           = true;
                }
            }
            await context.SaveChangesAsync();
            logger?.LogInformation("Đã seed 5 gói dịch vụ thực tế.");

            // 7. Seed 5 người cao tuổi mặc định nếu bảng đang rỗng
            if (!await context.ElderlyMembers.AnyAsync())
            {
                var elderlyToSeed = new List<ElderlyMember>
                {
                    new()
                    {
                        FullName = "Nguyễn Văn An",
                        DateOfBirth = new DateOnly(1948, 5, 12),
                        Gender = "Male",
                        Address = "Quận 9, TP. Thủ Đức",
                        EmergencyContactName = "Nguyễn Văn Thử Nghiệm",
                        EmergencyContactPhone = "0987654321",
                        MobilityStatus = "Normal",
                        Allergies = "Dị ứng Penicillin",
                        MedicalHistory = "Tăng huyết áp độ 1",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        FullName = "Trần Thị Bình",
                        DateOfBirth = new DateOnly(1942, 8, 20),
                        Gender = "Female",
                        Address = "Quận 2, TP. Thủ Đức",
                        EmergencyContactName = "Trần Tuấn Kiệt",
                        EmergencyContactPhone = "0912345678",
                        MobilityStatus = "Support",
                        Allergies = "Không có",
                        MedicalHistory = "Thoái hóa khớp gối, loãng xương",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        FullName = "Lê Văn Cường",
                        DateOfBirth = new DateOnly(1945, 11, 3),
                        Gender = "Male",
                        Address = "Bình Thạnh, TP.HCM",
                        EmergencyContactName = "Lê Hoàng Phúc",
                        EmergencyContactPhone = "0933221100",
                        MobilityStatus = "Normal",
                        Allergies = "Dị ứng Aspirin",
                        MedicalHistory = "Tiểu đường tuýp 2",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        FullName = "Phạm Thị Dung",
                        DateOfBirth = new DateOnly(1951, 3, 15),
                        Gender = "Female",
                        Address = "Thủ Đức, TP.HCM",
                        EmergencyContactName = "Phạm Thị Thảo",
                        EmergencyContactPhone = "0977889900",
                        MobilityStatus = "Support",
                        Allergies = "Không có",
                        MedicalHistory = "Tiền đình, hay chóng mặt",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        FullName = "Hoàng Văn Em",
                        DateOfBirth = new DateOnly(1946, 9, 28),
                        Gender = "Male",
                        Address = "Quận 9, TP.HCM",
                        EmergencyContactName = "Hoàng Quốc Bảo",
                        EmergencyContactPhone = "0909876543",
                        MobilityStatus = "Normal",
                        Allergies = "Không có",
                        MedicalHistory = "Sức khỏe ổn định",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.ElderlyMembers.AddRangeAsync(elderlyToSeed);
                await context.SaveChangesAsync();
                logger?.LogInformation("Đã seed 5 người cao tuổi mặc định vào bảng ElderlyMembers.");
            }

            // 8. Seed Vật tư y tế (MedicalSupplies) nếu bảng đang rỗng
            if (!await context.MedicalSupplies.AnyAsync())
            {
                var suppliesToSeed = new List<MedicalSupply>
                {
                    new()
                    {
                        SupplyName = "Băng cuộn y tế tiệt trùng 10cm x 2m",
                        Unit = "Cuộn",
                        MinimumStock = 10,
                        QuantityInStock = 45,
                        UnitPrice = 15000,
                        ExpiryDate = new DateOnly(2027, 12, 31),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Gạc vô trùng đắp vết thương 10x10cm",
                        Unit = "Miếng",
                        MinimumStock = 20,
                        QuantityInStock = 80,
                        UnitPrice = 5000,
                        ExpiryDate = new DateOnly(2028, 1, 1),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Cồn đỏ sát trùng Povidine 10% (20ml)",
                        Unit = "Chai",
                        MinimumStock = 5,
                        QuantityInStock = 18,
                        UnitPrice = 25000,
                        ExpiryDate = new DateOnly(2026, 12, 15),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Nước muối sinh lý NaCl 0.9% (500ml)",
                        Unit = "Chai",
                        MinimumStock = 8,
                        QuantityInStock = 25,
                        UnitPrice = 10000,
                        ExpiryDate = new DateOnly(2027, 10, 20),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Bông gòn y tế Bạch Tuyết (50g)",
                        Unit = "Gói",
                        MinimumStock = 5,
                        QuantityInStock = 30,
                        UnitPrice = 12000,
                        ExpiryDate = new DateOnly(2027, 6, 30),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Băng dán cá nhân thông khí Urgo",
                        Unit = "Hộp",
                        MinimumStock = 3,
                        QuantityInStock = 12,
                        UnitPrice = 35000,
                        ExpiryDate = new DateOnly(2027, 8, 15),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Cồn y tế sát khuẩn 70 độ (500ml)",
                        Unit = "Chai",
                        MinimumStock = 5,
                        QuantityInStock = 15,
                        UnitPrice = 28000,
                        ExpiryDate = new DateOnly(2026, 11, 30),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SupplyName = "Nẹp cố định chấn thương tay chân",
                        Unit = "Cái",
                        MinimumStock = 2,
                        QuantityInStock = 8,
                        UnitPrice = 65000,
                        ExpiryDate = new DateOnly(2029, 12, 31),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };

                await context.MedicalSupplies.AddRangeAsync(suppliesToSeed);
                await context.SaveChangesAsync();
                logger?.LogInformation("Đã seed 8 mặt hàng vật tư y tế thực tế vào bảng MedicalSupplies.");
            }

            // 9. Seed Sự cố mẫu (IncidentReports) nếu bảng đang rỗng
            if (!await context.IncidentReports.AnyAsync())
            {
                var elderly1 = await context.ElderlyMembers.FirstOrDefaultAsync();
                var elderly2 = await context.ElderlyMembers.Skip(1).FirstOrDefaultAsync();
                var adminUser = await context.Users.FirstOrDefaultAsync();

                if (elderly1 != null && adminUser != null)
                {
                    var sampleIncidents = new List<IncidentReport>
                    {
                        new()
                        {
                            ElderlyId = elderly1.ElderlyId,
                            ReportedBy = adminUser.UserId,
                            IncidentType = "Té ngã nhẹ tại hành lang",
                            Severity = "Medium",
                            Description = "Cụ bị hụt chân ngã nhẹ ở hành lang phòng sinh hoạt chung, xây xát nhẹ ở đầu gối phải. Đã tiến hành sát trùng bằng Povidine và băng gạc vô trùng.",
                            OccurredAt = DateTime.UtcNow.AddDays(-2),
                            ReportedAt = DateTime.UtcNow.AddDays(-2),
                            Status = "Resolved",
                            HandlingActions = "Đỡ cụ ngồi dậy an toàn, kiểm tra xương khớp không gãy, rửa vết thương bằng nước muối sinh lý, sát khuẩn Povidine và đắp gạc vô trùng.",
                            ResolutionNotes = "Cụ tỉnh táo hoàn toàn, đi lại bình thường, vết xước khô ráo.",
                            ResolvedAt = DateTime.UtcNow.AddDays(-2).AddHours(1),
                            IsSupplyConfirmed = true,
                            SupplyChargeAmount = 35000
                        }
                    };

                    if (elderly2 != null)
                    {
                        sampleIncidents.Add(new()
                        {
                            ElderlyId = elderly2.ElderlyId,
                            ReportedBy = adminUser.UserId,
                            IncidentType = "Tụt huyết áp & Khó thở cấp",
                            Severity = "Critical",
                            Description = "Cụ có biểu hiện chóng mặt dữ dội, vã mồ hôi, huyết áp đo được 85/50 mmHg kèm thở dốc. Đã cho thở oxy hỗ trợ và lập tức điều xe chuyển viện cấp cứu.",
                            OccurredAt = DateTime.UtcNow.AddHours(-5),
                            ReportedAt = DateTime.UtcNow.AddHours(-5),
                            Status = "InProgress",
                            HandlingActions = "Đặt cụ nằm đầu thấp, nới lỏng quần áo, hỗ trợ thở oxy mask 3L/phút, liên hệ khẩn cấp thân nhân và gọi xe cứu thương chuyển viện.",
                            HospitalName = "Bệnh viện Đa khoa Khu vực Thủ Đức",
                            HospitalTransferAt = DateTime.UtcNow.AddHours(-4),
                            HospitalEscort = "Y tá Trần Thị Thảo (Khoa Y tế)",
                            ResolutionNotes = "Đang được các bác sĩ khoa Cấp cứu bệnh viện theo dõi và truyền dịch.",
                            IsSupplyConfirmed = false,
                            SupplyChargeAmount = 0
                        });
                    }

                    await context.IncidentReports.AddRangeAsync(sampleIncidents);
                    await context.SaveChangesAsync();
                    logger?.LogInformation("Đã seed 2 sự cố thực tế mẫu vào bảng IncidentReports.");
                }
            }

            // 10. Gắn người cao tuổi với tài khoản gia đình (nếu có tài khoản family_test)
            var familyUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "family_test@daycare.com");
            if (familyUser != null)
            {
                var familyMember = await context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == familyUser.UserId);
                if (familyMember == null)
                {
                    familyMember = new FamilyMember
                    {
                        UserId = familyUser.UserId,
                        Address = "TP. Thủ Đức, TP. Hồ Chí Minh",
                        EmergencyContact = "0900000003"
                    };
                    await context.FamilyMembers.AddAsync(familyMember);
                    await context.SaveChangesAsync();
                }

                var firstElderly = await context.ElderlyMembers.FirstOrDefaultAsync();
                if (firstElderly != null && !await context.ElderlyFamilyRelationships.AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId))
                {
                    await context.ElderlyFamilyRelationships.AddAsync(new ElderlyFamilyRelationship
                    {
                        FamilyMemberId = familyMember.FamilyMemberId,
                        ElderlyId = firstElderly.ElderlyId,
                        Relationship = "Con trai",
                        IsPrimaryContact = true,
                        CanViewCareLogs = true,
                        CanReceiveNotifications = true
                    });
                    await context.SaveChangesAsync();
                    logger?.LogInformation("Đã liên kết tài khoản family_test@daycare.com với người cao tuổi đầu tiên.");
                }
            }

            // 11. Demo seed idempotent (không xóa user/data thật)
            await SeedDemoDataAsync(context, passwordHasher, logger);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Lỗi trong quá trình seed dữ liệu mặc định: {Message}", ex.Message);
        }
    }

    private const string DemoPassword = "Demo@123456";
    private const string DemoElderlyMarker = "[SEED_DEMO]";
    private const string DemoPlanNotes = "[SEED_DEMO] Kế hoạch phân công hôm nay";
    private const string DemoMedMarker = "[SEED_DEMO]";

    private static async Task SeedDemoDataAsync(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        ILogger? logger)
    {
        var staffRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Staff");
        var familyRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "FamilyMember");
        if (staffRole == null || familyRole == null)
        {
            logger?.LogWarning("Seed demo bỏ qua: thiếu role Staff/FamilyMember.");
            return;
        }

        var passwordHash = passwordHasher.HashPassword(DemoPassword);
        var now = VietnamTime.Now;
        var today = VietnamTime.Today;

        // --- 3 Staff (email chuẩn + migrate từ *.demo@ nếu còn) ---
        var staffSpecs = new (string Email, string LegacyEmail, string FullName, string Phone, string Position)[]
        {
            ("staff1@daycare.com", "staff1.demo@daycare.com", "Nguyễn Thị Lan (Demo Staff)", "0911000001", "Điều dưỡng"),
            ("staff2@daycare.com", "staff2.demo@daycare.com", "Trần Văn Minh (Demo Staff)", "0911000002", "Nhân viên chăm sóc"),
            ("staff3@daycare.com", "staff3.demo@daycare.com", "Lê Thu Hà (Demo Staff)", "0911000003", "Điều dưỡng trưởng"),
        };

        var staffUsers = new List<User>();
        foreach (var (email, legacyEmail, fullName, phone, position) in staffSpecs)
        {
            var user = await EnsureDemoUserAsync(context, staffRole, email, legacyEmail, fullName, phone, passwordHash, now);
            staffUsers.Add(user);

            try
            {
                var profile = await context.StaffProfiles.FindAsync(user.UserId);
                if (profile == null)
                {
                    await context.StaffProfiles.AddAsync(new StaffProfile
                    {
                        UserId = user.UserId,
                        Position = position,
                        Qualification = "Demo seed",
                        StartDate = DateOnly.FromDateTime(now.AddYears(-1)),
                        UpdatedAt = now
                    });
                    await context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                logger?.LogDebug(ex, "Bỏ qua StaffProfile cho {Email}.", email);
                context.ChangeTracker.Clear();
            }
        }

        // --- 2 Family ---
        var familySpecs = new (string Email, string LegacyEmail, string FullName, string Phone, string Address)[]
        {
            ("family1@daycare.com", "family1.demo@daycare.com", "Phạm Quốc Anh (Demo Family)", "0922000001", "Cầu Giấy, Hà Nội"),
            ("family2@daycare.com", "family2.demo@daycare.com", "Hoàng Thị Mai (Demo Family)", "0922000002", "Thanh Xuân, Hà Nội"),
        };

        var familyMembers = new List<FamilyMember>();
        foreach (var (email, legacyEmail, fullName, phone, address) in familySpecs)
        {
            var user = await EnsureDemoUserAsync(context, familyRole, email, legacyEmail, fullName, phone, passwordHash, now);
            var fm = await context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == user.UserId);
            if (fm == null)
            {
                fm = new FamilyMember
                {
                    UserId = user.UserId,
                    Address = address,
                    EmergencyContact = phone
                };
                await context.FamilyMembers.AddAsync(fm);
                await context.SaveChangesAsync();
            }
            familyMembers.Add(fm);
        }

        // --- 15 Elderly IsActive (idempotent via CareNotes marker) ---
        var elderlyNames = new (string FullName, string Gender, string Mobility, int BirthYear)[]
        {
            ("Nguyễn Văn Hùng", "Male", "Normal", 1945),
            ("Trần Thị Bích", "Female", "Normal", 1948),
            ("Lê Văn Cường", "Male", "Support", 1942),
            ("Phạm Thị Dung", "Female", "Normal", 1950),
            ("Hoàng Văn Em", "Male", "Support", 1940),
            ("Vũ Thị Phương", "Female", "Normal", 1952),
            ("Đặng Văn Giang", "Male", "Normal", 1947),
            ("Bùi Thị Hoa", "Female", "Support", 1944),
            ("Đỗ Văn Ích", "Male", "Normal", 1949),
            ("Ngô Thị Kim", "Female", "Normal", 1951),
            ("Dương Văn Long", "Male", "Support", 1943),
            ("Lý Thị My", "Female", "Normal", 1953),
            ("Phan Văn Nam", "Male", "Normal", 1946),
            ("Tô Thị Oanh", "Female", "Support", 1941),
            ("Cao Văn Phúc", "Male", "Normal", 1954),
        };

        var elderlyList = new List<ElderlyMember>();
        for (var i = 0; i < elderlyNames.Length; i++)
        {
            var spec = elderlyNames[i];
            var marker = $"{DemoElderlyMarker}#{i + 1:D2}";
            var elderly = await context.ElderlyMembers
                .FirstOrDefaultAsync(e => e.CareNotes != null && e.CareNotes.Contains(marker));

            if (elderly == null)
            {
                elderly = new ElderlyMember
                {
                    FullName = spec.FullName,
                    DateOfBirth = new DateOnly(spec.BirthYear, (i % 12) + 1, 10),
                    Gender = spec.Gender,
                    Address = i < 8 ? familySpecs[0].Address : familySpecs[1].Address,
                    EmergencyContactName = i < 8 ? familySpecs[0].FullName : familySpecs[1].FullName,
                    EmergencyContactPhone = i < 8 ? familySpecs[0].Phone : familySpecs[1].Phone,
                    Allergies = i % 3 == 0 ? "Không" : null,
                    MedicalHistory = i % 4 == 0 ? "Tăng huyết áp" : null,
                    MobilityStatus = spec.Mobility,
                    CareNotes = $"{marker} Hồ sơ demo — không xóa tay nếu còn dùng seed.",
                    IsActive = true,
                    CreatedAt = now
                };
                await context.ElderlyMembers.AddAsync(elderly);
                await context.SaveChangesAsync();
            }
            else
            {
                elderly.IsActive = true;
                elderly.FullName = spec.FullName;
                elderly.MobilityStatus = spec.Mobility;
                await context.SaveChangesAsync();
            }
            elderlyList.Add(elderly);
        }

        // --- Link Family–NCT + CanViewCareLogs / CanReceiveNotifications ---
        for (var i = 0; i < elderlyList.Count; i++)
        {
            var fm = i < 8 ? familyMembers[0] : familyMembers[1];
            var elderly = elderlyList[i];
            var existingRel = await context.ElderlyFamilyRelationships
                .FirstOrDefaultAsync(r => r.ElderlyId == elderly.ElderlyId && r.FamilyMemberId == fm.FamilyMemberId);

            if (existingRel == null)
            {
                await context.ElderlyFamilyRelationships.AddAsync(new ElderlyFamilyRelationship
                {
                    ElderlyId = elderly.ElderlyId,
                    FamilyMemberId = fm.FamilyMemberId,
                    Relationship = i % 2 == 0 ? "Con" : "Cháu",
                    IsPrimaryContact = true,
                    CanViewCareLogs = true,
                    CanReceiveNotifications = true
                });
                await context.SaveChangesAsync();
            }
            else
            {
                existingRel.CanViewCareLogs = true;
                existingRel.CanReceiveNotifications = true;
                existingRel.IsPrimaryContact = true;
                await context.SaveChangesAsync();
            }

            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    IF COL_LENGTH('ElderlyFamilyRelationships', 'RelationshipType') IS NOT NULL
                        UPDATE ElderlyFamilyRelationships
                        SET RelationshipType = Relationship
                        WHERE ElderlyId = {0} AND FamilyMemberId = {1}
                          AND (RelationshipType IS NULL OR RelationshipType = '')",
                    elderly.ElderlyId, fm.FamilyMemberId);
            }
            catch { /* ignore schema drift */ }
        }

        // --- Registration Confirmed cho TẤT CẢ NCT (monthly full_week, phủ hôm nay) ---
        var packages = await context.ServicePackages
            .Where(p => p.IsActive)
            .OrderBy(p => p.PackageId)
            .Take(3)
            .ToListAsync();

        if (packages.Count == 0)
        {
            logger?.LogWarning("Seed demo: chưa có ServicePackage — bỏ qua Registration.");
        }
        else
        {
            for (var i = 0; i < elderlyList.Count; i++)
            {
                var code = $"DEMO-REG-{i + 1:D2}";
                var existingReg = await context.ServiceRegistrations
                    .FirstOrDefaultAsync(r => r.RegistrationCode == code);

                var pkg = packages[i % packages.Count];
                var elderly = elderlyList[i];
                var fm = i < 8 ? familyMembers[0] : familyMembers[1];
                var start = today.AddDays(-7);
                DateOnly? end = today.AddMonths(1);
                var support = elderly.MobilityStatus == "Support" ? 500000m : 0m;
                var basePrice = pkg.PriceMonthFullWeek > 0 ? pkg.PriceMonthFullWeek : pkg.Price;

                if (existingReg == null)
                {
                    var reg = new ServiceRegistration
                    {
                        ElderlyId = elderly.ElderlyId,
                        PackageId = pkg.PackageId,
                        StartDate = start,
                        EndDate = end,
                        PriceAtPurchase = basePrice,
                        Status = "Confirmed",
                        CreatedAt = now,
                        RegistrationCode = code,
                        RegistrationType = "monthly",
                        MonthlyPattern = "full_week",
                        RoomType = "large",
                        TotalDays = 22,
                        SupportSurcharge = support,
                        RoomSurcharge = 0,
                        TotalAmount = basePrice + support
                    };
                    await context.ServiceRegistrations.AddAsync(reg);
                    await context.SaveChangesAsync();

                    try
                    {
                        await context.Database.ExecuteSqlRawAsync(@"
                            IF COL_LENGTH('ServiceRegistrations', 'FamilyMemberId') IS NOT NULL
                                UPDATE ServiceRegistrations SET FamilyMemberId = {0}
                                WHERE RegistrationId = {1}",
                            fm.FamilyMemberId, reg.RegistrationId);
                    }
                    catch { /* ignore */ }
                }
                else
                {
                    existingReg.Status = "Confirmed";
                    existingReg.StartDate = start;
                    existingReg.EndDate = end;
                    existingReg.RegistrationType = "monthly";
                    existingReg.MonthlyPattern = "full_week";
                    existingReg.PackageId = pkg.PackageId;
                    await context.SaveChangesAsync();
                }
            }
        }

        // --- Phân công hôm nay (GetAssignedElderlyIdsAsync: Published/Confirmed + StaffCareAssignments / CareGroups) ---
        // staff1: 5 NCT đầu, staff2: 5 tiếp, staff3: phần còn lại
        var assignmentBuckets = new[]
        {
            (Staff: staffUsers[0], Elderly: elderlyList.Take(5).ToList()),
            (Staff: staffUsers[1], Elderly: elderlyList.Skip(5).Take(5).ToList()),
            (Staff: staffUsers[2], Elderly: elderlyList.Skip(10).ToList()),
        };

        var plan = await context.DailySchedulePlans.FirstOrDefaultAsync(p => p.PlanDate == today);
        if (plan == null)
        {
            plan = new DailySchedulePlan
            {
                PlanDate = today,
                Status = "Published",
                ConfirmedAt = now,
                ConfirmedBy = staffUsers[0].UserId,
                TotalStaff = 3,
                TotalElderly = elderlyList.Count,
                Notes = DemoPlanNotes,
                CreatedAt = now,
                UpdatedAt = now
            };
            await context.DailySchedulePlans.AddAsync(plan);
            await context.SaveChangesAsync();
        }
        else
        {
            plan.Status = "Published";
            plan.ConfirmedAt ??= now;
            plan.ConfirmedBy ??= staffUsers[0].UserId;
            plan.TotalStaff = 3;
            plan.TotalElderly = elderlyList.Count;
            plan.Notes = string.IsNullOrWhiteSpace(plan.Notes) ? DemoPlanNotes : plan.Notes;
            plan.UpdatedAt = now;
            await context.SaveChangesAsync();
        }

        foreach (var bucket in assignmentBuckets)
        {
            foreach (var elderly in bucket.Elderly)
            {
                var assignment = await context.StaffCareAssignments
                    .FirstOrDefaultAsync(a => a.PlanId == plan.PlanId && a.ElderlyId == elderly.ElderlyId);
                if (assignment == null)
                {
                    await context.StaffCareAssignments.AddAsync(new StaffCareAssignment
                    {
                        PlanId = plan.PlanId,
                        StaffId = bucket.Staff.UserId,
                        ElderlyId = elderly.ElderlyId,
                        Notes = DemoElderlyMarker,
                        CreatedAt = now
                    });
                }
                else
                {
                    assignment.StaffId = bucket.Staff.UserId;
                    assignment.Notes = DemoElderlyMarker;
                }
            }
        }
        await context.SaveChangesAsync();

        // Mirror qua DailyCareGroups + CareGroupMembers (cùng guard)
        var demoElderlyIds = elderlyList.Select(e => e.ElderlyId).ToList();
        var staleMembers = await context.CareGroupMembers
            .Where(m => m.Group.PlanId == plan.PlanId && demoElderlyIds.Contains(m.ElderlyId))
            .ToListAsync();
        if (staleMembers.Count > 0)
        {
            context.CareGroupMembers.RemoveRange(staleMembers);
            await context.SaveChangesAsync();
        }

        foreach (var bucket in assignmentBuckets)
        {
            var groupName = $"Demo-{bucket.Staff.Email.Split('@')[0]}";
            var group = await context.DailyCareGroups
                .FirstOrDefaultAsync(g => g.PlanId == plan.PlanId && g.StaffId == bucket.Staff.UserId);
            if (group == null)
            {
                group = new DailyCareGroup
                {
                    PlanId = plan.PlanId,
                    GroupName = groupName,
                    GroupType = "Normal",
                    StaffId = bucket.Staff.UserId,
                    MaxNormalCapacity = 10,
                    MaxSupportCapacity = 4,
                    Notes = DemoElderlyMarker,
                    CreatedAt = now
                };
                await context.DailyCareGroups.AddAsync(group);
                await context.SaveChangesAsync();
            }
            else
            {
                group.GroupName = groupName;
                group.StaffId = bucket.Staff.UserId;
                group.Notes = DemoElderlyMarker;
                await context.SaveChangesAsync();
            }

            foreach (var elderly in bucket.Elderly)
            {
                var member = await context.CareGroupMembers
                    .FirstOrDefaultAsync(m => m.GroupId == group.GroupId && m.ElderlyId == elderly.ElderlyId);
                if (member == null)
                {
                    await context.CareGroupMembers.AddAsync(new CareGroupMember
                    {
                        GroupId = group.GroupId,
                        ElderlyId = elderly.ElderlyId,
                        AssignedAt = now,
                        Notes = DemoElderlyMarker
                    });
                }
            }
            await context.SaveChangesAsync();
        }

        // --- Optional: MedicationPlan + Pending doses hôm nay cho 2 NCT của staff1 ---
        // DB live còn AdministeredDate/Time NOT NULL — insert record qua SQL raw.
        try
        {
            var medTargets = elderlyList.Take(2).ToList();
            var medSpecs = new (string Name, string Dosage)[]
            {
                ("Amlodipine (Demo)", "5mg"),
                ("Metformin (Demo)", "500mg"),
            };

            for (var i = 0; i < medTargets.Count; i++)
            {
                var elderly = medTargets[i];
                var (medName, dosage) = medSpecs[i];
                var planMed = await context.MedicationPlans
                    .FirstOrDefaultAsync(p => p.ElderlyId == elderly.ElderlyId && p.MedicationName == medName);

                if (planMed == null)
                {
                    planMed = new MedicationPlan
                    {
                        ElderlyId = elderly.ElderlyId,
                        MedicationName = medName,
                        Dosage = dosage,
                        Instructions = $"{DemoMedMarker} Uống sau ăn — seed test Given",
                        StartDate = today.AddDays(-14),
                        EndDate = null,
                        IsActive = true,
                        CreatedAt = now
                    };
                    await context.MedicationPlans.AddAsync(planMed);
                    await context.SaveChangesAsync();

                    try
                    {
                        await context.Database.ExecuteSqlRawAsync(@"
                            IF COL_LENGTH('MedicationPlans', 'Frequency') IS NOT NULL
                                UPDATE MedicationPlans SET Frequency = N'2 lần/ngày'
                                WHERE MedicationPlanId = {0} AND (Frequency IS NULL OR Frequency = '')",
                            planMed.MedicationPlanId);
                    }
                    catch { /* ignore */ }
                }
                else
                {
                    planMed.IsActive = true;
                    planMed.Dosage = dosage;
                    planMed.Instructions = $"{DemoMedMarker} Uống sau ăn — seed test Given";
                    await context.SaveChangesAsync();
                }

                var doseTimes = new[] { new TimeOnly(8, 0), new TimeOnly(14, 0) };
                foreach (var t in doseTimes)
                {
                    var scheduledAt = today.ToDateTime(t);
                    var exists = await context.MedicationRecords.AnyAsync(r =>
                        r.MedicationPlanId == planMed.MedicationPlanId
                        && r.ScheduledAt == scheduledAt);
                    if (exists) continue;

                    await context.Database.ExecuteSqlRawAsync(@"
                        INSERT INTO MedicationRecords
                            (MedicationPlanId, AdministeredDate, AdministeredTime, Status, StaffId, Notes, CreatedAt, ScheduledAt, RecordedAt)
                        VALUES
                            ({0}, {1}, {2}, N'Pending', NULL, N'[SEED_DEMO]', SYSDATETIME(), {3}, NULL)",
                        planMed.MedicationPlanId,
                        today,
                        t.ToTimeSpan(),
                        scheduledAt);
                }
            }
        }
        catch (Exception medEx)
        {
            logger?.LogWarning(medEx, "Seed demo thuốc (optional) lỗi — phân công Staff/NCT vẫn dùng được.");
        }

        var assignSummary = string.Join(" | ", assignmentBuckets.Select(b =>
            $"{b.Staff.Email}:[{string.Join(",", b.Elderly.Select(e => e.ElderlyId))}]"));
        logger?.LogInformation(
            "DEMO SEED OK — password={Password}; Staff=staff1/2/3@daycare.com; Family=family1/2@daycare.com; PlanDate={Today} Published; Assign={Assign}",
            DemoPassword, today, assignSummary);
    }

    private static async Task<User> EnsureDemoUserAsync(
        AppDbContext context,
        Role role,
        string email,
        string legacyEmail,
        string fullName,
        string phone,
        string passwordHash,
        DateTime now)
    {
        var user = await context.Users.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email == email);

        if (user == null && !string.IsNullOrWhiteSpace(legacyEmail))
        {
            user = await context.Users.Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.Email == legacyEmail);
            if (user != null)
            {
                user.Email = email;
                user.FullName = fullName;
                user.PhoneNumber = phone;
                user.PasswordHash = passwordHash;
                user.IsActive = true;
                user.UpdatedAt = now;
            }
        }

        if (user == null)
        {
            user = new User
            {
                Email = email,
                PasswordHash = passwordHash,
                FullName = fullName,
                PhoneNumber = phone,
                IsActive = true,
                CreatedAt = now
            };
            user.Roles.Add(role);
            await context.Users.AddAsync(user);
            await context.SaveChangesAsync();
            return user;
        }

        if (!user.Roles.Any(r => r.RoleId == role.RoleId || r.RoleName == role.RoleName))
            user.Roles.Add(role);
        user.IsActive = true;
        user.FullName = fullName;
        user.PasswordHash = passwordHash;
        await context.SaveChangesAsync();
        return user;
    }
}
