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
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Lỗi trong quá trình seed dữ liệu mặc định: {Message}", ex.Message);
        }
    }
}
