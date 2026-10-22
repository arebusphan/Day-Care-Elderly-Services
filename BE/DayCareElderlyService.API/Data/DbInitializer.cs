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
            // 1. Tự động đồng bộ các cột mới của bảng ElderlyMembers
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
                        ALTER TABLE ElderlyMembers ADD MobilityStatus NVARCHAR(50) NULL DEFAULT N'Bình thường';

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ElderlyMembers' AND COLUMN_NAME = 'CareNotes')
                        ALTER TABLE ElderlyMembers ADD CareNotes NVARCHAR(1000) NULL;

                    -- Nới lỏng CHECK constraint CK_ElderlyMembers_Gender để chấp nhận cả Male, Female, Nam, Nữ
                    IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_ElderlyMembers_Gender')
                    BEGIN
                        ALTER TABLE ElderlyMembers DROP CONSTRAINT CK_ElderlyMembers_Gender;
                        ALTER TABLE ElderlyMembers ADD CONSTRAINT CK_ElderlyMembers_Gender CHECK (Gender IN ('Male', 'Female', 'Other', N'Nam', N'Nữ', N'Khác'));
                    END
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncElderlySql);

            // 2. Tự động đồng bộ các cột cho ServicePackages, ServiceRegistrations, Payments
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

                    -- Mở rộng độ dài cột PaymentMethod để lưu đủ phương thức thanh toán dài
                    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Payments' AND COLUMN_NAME = 'PaymentMethod' AND CHARACTER_MAXIMUM_LENGTH < 100)
                        ALTER TABLE Payments ALTER COLUMN PaymentMethod NVARCHAR(100) NOT NULL;
                END

                -- Cho phép EndDate nhận NULL cho các gói đăng ký linh hoạt
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ServiceRegistrations' AND COLUMN_NAME = 'EndDate' AND IS_NULLABLE = 'NO')
                    ALTER TABLE ServiceRegistrations ALTER COLUMN EndDate DATE NULL;

                -- Gỡ bỏ các CHECK constraint cũ trên Payments và ServiceRegistrations nếu có
                DECLARE @dropCheckSql NVARCHAR(MAX) = N'';
                SELECT @dropCheckSql += N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(name) + N'; '
                FROM sys.check_constraints
                WHERE parent_object_id IN (OBJECT_ID('Payments'), OBJECT_ID('ServiceRegistrations'));
                IF @dropCheckSql <> N''
                    EXEC sp_executesql @dropCheckSql;
            ";
            await context.Database.ExecuteSqlRawAsync(syncPackagesSql);
            logger?.LogInformation("Đã kiểm tra và đồng bộ cấu trúc bảng ServicePackages, ServiceRegistrations, Payments thành công.");

            // 3. Ensure Roles
            var defaultRoles = new List<Role>
            {
                new() { RoleName = "Admin", Description = "Quản trị viên toàn quyền hệ thống" },
                new() { RoleName = "Staff", Description = "Nhân viên chăm sóc và điều dưỡng" },
                new() { RoleName = "FamilyMember", Description = "Thành viên gia đình của người cao tuổi" }
            };

            foreach (var role in defaultRoles)
            {
                if (!await context.Roles.AnyAsync(r => r.RoleName == role.RoleName))
                {
                    await context.Roles.AddAsync(role);
                }
            }
            await context.SaveChangesAsync();

            // 4. Ensure Default Center
            var defaultCenterId = Guid.Parse("11111111-1111-1111-1111-111111111111");
            var center = await context.Centers.FirstOrDefaultAsync(c => c.CenterId == defaultCenterId);
            if (center == null)
            {
                center = new Center
                {
                    CenterId = defaultCenterId,
                    CenterName = "Trung Tâm Chăm Sóc Người Cao Tuổi Day Care",
                    Address = "Số 123 Đường Hạnh Phúc, Quận Cầu Giấy, Hà Nội",
                    PhoneNumber = "1900 6868",
                    Email = "contact@daycare-elderly.vn",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                await context.Centers.AddAsync(center);
                await context.SaveChangesAsync();
                logger?.LogInformation("Đã khởi tạo Trung Tâm Day Care mặc định.");
            }

            // 5. Ensure Default Admin User
            var adminEmail = "admin@daycare.com";
            if (!await context.Users.AnyAsync(u => u.Email == adminEmail))
            {
                var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");

                var adminUser = new User
                {
                    UserId = Guid.NewGuid(),
                    Email = adminEmail,
                    PasswordHash = passwordHasher.HashPassword("Admin@123456"),
                    FullName = "Hệ Thống Quản Trị Viên",
                    PhoneNumber = "0901234567",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                if (adminRole != null)
                {
                    adminUser.Roles.Add(adminRole);
                }

                await context.Users.AddAsync(adminUser);
                await context.SaveChangesAsync();
                logger?.LogInformation("Tài khoản Admin mặc định (admin@daycare.com / Admin@123456) đã được khởi tạo.");
            }

            // 6. Ensure 5 Real Service Packages in Database
            var defaultPackages = new List<ServicePackage>
            {
                new()
                {
                    PackageId = Guid.Parse("22222222-0001-0000-0000-000000000001"),
                    CenterId = defaultCenterId,
                    PackageName = "Cơ bản",
                    Description = "Dành cho người cao tuổi khỏe mạnh hoặc giảm nhẹ vận động, cần giao lưu và sinh hoạt ban ngày.",
                    Price = 6000000,
                    BillingPeriod = "Monthly",
                    PricePerDay = 300000,
                    PriceMonth3Days = 3300000,
                    PriceMonthFullWeek = 6000000,
                    Highlights = "Chăm sóc bán trú 07:00 – 17:00;3 bữa ăn dinh dưỡng đầy đủ;Kiểm tra sức khỏe cơ bản mỗi sáng;Hoạt động thể dục dưỡng sinh, giải trí nhẹ",
                    IncludedServices = "Bán trú tiêu chuẩn;Bữa sáng, bữa trưa, bữa phụ chiều;Theo dõi chỉ số sinh tồn;Nhật ký theo dõi hàng ngày",
                    TargetAudience = "Người cao tuổi tự chủ sinh hoạt, cần môi trường giao lưu kết bạn",
                    PricingNote = "Phụ phí hỗ trợ tăng cường nếu cụ cần hỗ trợ di chuyển.",
                    TotalSlots = 45,
                    EndOfLifeRoomIncluded = false,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    PackageId = Guid.Parse("22222222-0002-0000-0000-000000000002"),
                    CenterId = defaultCenterId,
                    PackageName = "Phục hồi chức năng",
                    Description = "Dành cho người cao tuổi yếu vận động, sau phẫu thuật xương khớp, cần phục hồi tầm vận động và thể lực.",
                    Price = 9000000,
                    BillingPeriod = "Monthly",
                    PricePerDay = 450000,
                    PriceMonth3Days = 4950000,
                    PriceMonthFullWeek = 9000000,
                    Highlights = "Tập vật lý trị liệu 1-kèm-2;Tập dáng đi, thăng bằng và sức cơ;Dụng cụ chuyên dụng và xe đạp trợ lực;Báo cáo tiến triển phục hồi hằng tuần",
                    IncludedServices = "Toàn bộ quyền lợi Gói Cơ bản;Vật lý trị liệu chuyên biệt 5 buổi/tuần;Dụng cụ tập phục hồi;Bác sĩ PHCN đánh giá tiến độ",
                    TargetAudience = "Người cao tuổi sau phẫu thuật khớp, sau bó bột hoặc suy giảm cơ lực",
                    PricingNote = "",
                    TotalSlots = 20,
                    EndOfLifeRoomIncluded = false,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    PackageId = Guid.Parse("22222222-0003-0000-0000-000000000003"),
                    CenterId = defaultCenterId,
                    PackageName = "Sa sút trí tuệ",
                    Description = "Dành cho người cao tuổi hay quên, lú lẫn, Alzheimer, cần môi trường an toàn và giám sát chuyên biệt.",
                    Price = 10000000,
                    BillingPeriod = "Monthly",
                    PricePerDay = 500000,
                    PriceMonth3Days = 5500000,
                    PriceMonthFullWeek = 10000000,
                    Highlights = "Khuôn viên khép kín, an toàn tuyệt đối 24/7;Liệu pháp âm nhạc, mùi hương, gợi nhớ ký ức;Điều dưỡng viên chuyên trách sa sút trí tuệ;Lịch sinh hoạt cố định giúp tâm lý an ổn",
                    IncludedServices = "Toàn bộ quyền lợi Gói Cơ bản;Điều dưỡng chuyên trách hỗ trợ 1-1;Liệu pháp kích thích nhận thức;Vườn an toàn khép kín",
                    TargetAudience = "Người cao tuổi mắc bệnh Alzheimer, suy giảm trí nhớ từ nhẹ đến trung bình",
                    PricingNote = "",
                    TotalSlots = 15,
                    EndOfLifeRoomIncluded = false,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    PackageId = Guid.Parse("22222222-0004-0000-0000-000000000004"),
                    CenterId = defaultCenterId,
                    PackageName = "Sau tai biến",
                    Description = "Dành cho người cao tuổi có di chứng tai biến mạch máu não, liệt nửa người, rối loạn nuốt hoặc phát âm.",
                    Price = 11000000,
                    BillingPeriod = "Monthly",
                    PricePerDay = 550000,
                    PriceMonth3Days = 6050000,
                    PriceMonthFullWeek = 11000000,
                    Highlights = "Tập chống co cứng cơ và phục hồi chức năng vận động;Âm ngữ trị liệu, tập nuốt an toàn;Y học cổ truyền: bấm huyệt, ngâm chân thảo mộc;Theo dõi chỉ số huyết áp, tim mạch liên tục",
                    IncludedServices = "Toàn bộ quyền lợi Gói Cơ bản;Phục hồi chức năng tai biến chuyên sâu;Âm ngữ trị liệu và tập nuốt;Bấm huyệt thư giãn cơ",
                    TargetAudience = "Người cao tuổi sau đột quỵ/tai biến dưới 1 năm",
                    PricingNote = "",
                    TotalSlots = 12,
                    EndOfLifeRoomIncluded = false,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new()
                {
                    PackageId = Guid.Parse("22222222-0005-0000-0000-000000000005"),
                    CenterId = defaultCenterId,
                    PackageName = "Giai đoạn cuối",
                    Description = "Dành cho người cao tuổi cần chăm sóc giảm nhẹ, tạo sự thoải mái tối đa và đồng hành tinh thần những năm tháng cuối đời.",
                    Price = 14000000,
                    BillingPeriod = "Monthly",
                    PricePerDay = 700000,
                    PriceMonth3Days = 7700000,
                    PriceMonthFullWeek = 14000000,
                    Highlights = "Phòng VIP 1–2 người yên tĩnh đã bao gồm trọn gói;Chăm sóc giảm nhẹ, xoa bóp lăn trở chống loét từng giờ;Đồng hành tinh thần, kết nối gia đình mọi lúc;Chế độ dinh dưỡng đặc biệt, nấu theo yêu cầu của cụ",
                    IncludedServices = "Toàn bộ quyền lợi Gói Cơ bản;Phòng VIP 1–2 người riêng tư (đã bao gồm);Chăm sóc giảm đau, giảm nhẹ;Điều dưỡng túc trực 24/7",
                    TargetAudience = "Người cao tuổi sức khỏe suy kiệt cần chăm sóc an dưỡng thoải mái",
                    PricingNote = "Lưu ý: Dịch vụ chăm sóc thoải mái, không thay thế cơ sở y tế chuyên khoa.",
                    TotalSlots = 8,
                    EndOfLifeRoomIncluded = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            };

            foreach (var pkg in defaultPackages)
            {
                var existing = await context.ServicePackages.FirstOrDefaultAsync(p => p.PackageId == pkg.PackageId);
                if (existing == null)
                {
                    await context.ServicePackages.AddAsync(pkg);
                }
                else
                {
                    // Cập nhật thông tin chi tiết nếu đã tồn tại
                    existing.PackageName = pkg.PackageName;
                    existing.Description = pkg.Description;
                    existing.PricePerDay = pkg.PricePerDay;
                    existing.PriceMonth3Days = pkg.PriceMonth3Days;
                    existing.PriceMonthFullWeek = pkg.PriceMonthFullWeek;
                    existing.Highlights = pkg.Highlights;
                    existing.IncludedServices = pkg.IncludedServices;
                    existing.TargetAudience = pkg.TargetAudience;
                    existing.PricingNote = pkg.PricingNote;
                    existing.TotalSlots = pkg.TotalSlots;
                    existing.EndOfLifeRoomIncluded = pkg.EndOfLifeRoomIncluded;
                    existing.IsActive = true;
                }
            }
            await context.SaveChangesAsync();
            logger?.LogInformation("Đã khởi tạo và cập nhật 5 gói dịch vụ thực tế trong cơ sở dữ liệu.");
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Lỗi trong quá trình khởi tạo dữ liệu mặc định: {Message}", ex.Message);
        }
    }
}
