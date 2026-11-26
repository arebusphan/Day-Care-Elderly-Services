-- ==============================================================================
-- SCRIPT SEED DỮ LIỆU THỰC TẾ CHO LUỒNG WF-05 (SỰ CỐ & VẬT TƯ Y TẾ)
-- Cơ sở dữ liệu: DayCareElderlyDB
-- Chạy an toàn nhiều lần (Idempotent - không trùng lặp dữ liệu)
-- ==============================================================================

USE DayCareElderlyDB;
GO

SET NOCOUNT ON;

PRINT N'--- Bắt đầu kiểm tra và seed dữ liệu thực tế cho luồng WF-05 ---';

-- 1. SEED 5 NGƯỜI CAO TUỔI THỰC TẾ (Nếu bảng ElderlyMembers chưa có)
IF NOT EXISTS (SELECT 1 FROM dbo.ElderlyMembers)
BEGIN
    INSERT INTO dbo.ElderlyMembers (
        FullName, DateOfBirth, Gender, Address,
        EmergencyContactName, EmergencyContactPhone,
        MobilityStatus, Allergies, MedicalHistory,
        IsActive, CreatedAt
    )
    VALUES
    (N'Nguyễn Văn An', '1948-05-12', 'Male', N'Quận 9, TP. Thủ Đức', N'Nguyễn Văn Thử Nghiệm', '0987654321', 'Normal', N'Dị ứng Penicillin', N'Tăng huyết áp độ 1', 1, GETUTCDATE()),
    (N'Trần Thị Bình', '1942-08-20', 'Female', N'Quận 2, TP. Thủ Đức', N'Trần Tuấn Kiệt', '0912345678', 'Support', N'Không có', N'Thoái hóa khớp gối, loãng xương', 1, GETUTCDATE()),
    (N'Lê Văn Cường', '1945-11-03', 'Male', N'Bình Thạnh, TP.HCM', N'Lê Hoàng Phúc', '0933221100', 'Normal', N'Dị ứng Aspirin', N'Tiểu đường tuýp 2', 1, GETUTCDATE()),
    (N'Phạm Thị Dung', '1951-03-15', 'Female', N'Thủ Đức, TP.HCM', N'Phạm Thị Thảo', '0977889900', 'Support', N'Không có', N'Tiền đình, hay chóng mặt', 1, GETUTCDATE()),
    (N'Hoàng Văn Em', '1946-09-28', 'Male', N'Quận 9, TP.HCM', N'Hoàng Quốc Bảo', '0909876543', 'Normal', N'Không có', N'Sức khỏe ổn định', 1, GETUTCDATE());

    PRINT N'-> Đã chèn 5 người cao tuổi thực tế vào bảng ElderlyMembers.';
END
ELSE
BEGIN
    PRINT N'-> Bảng ElderlyMembers đã có dữ liệu.';
END
GO

-- 2. SEED 8 MẶT HÀNG VẬT TƯ Y TẾ SƠ CỨU (Nếu bảng MedicalSupplies chưa có)
IF NOT EXISTS (SELECT 1 FROM dbo.MedicalSupplies)
BEGIN
    INSERT INTO dbo.MedicalSupplies (
        SupplyName, Unit, MinimumStock, QuantityInStock, UnitPrice, ExpiryDate, IsActive, CreatedAt
    )
    VALUES
    (N'Băng cuộn y tế tiệt trùng 10cm x 2m', N'Cuộn', 10.0, 45.0, 15000.0, '2027-12-31', 1, GETUTCDATE()),
    (N'Gạc vô trùng đắp vết thương 10x10cm', N'Miếng', 20.0, 80.0, 5000.0, '2028-01-01', 1, GETUTCDATE()),
    (N'Cồn đỏ sát trùng Povidine 10% (20ml)', N'Chai', 5.0, 18.0, 25000.0, '2026-12-15', 1, GETUTCDATE()), -- Cận hạn ~18 ngày (SR-04 Warning)
    (N'Nước muối sinh lý NaCl 0.9% (500ml)', N'Chai', 8.0, 25.0, 10000.0, '2027-10-20', 1, GETUTCDATE()),
    (N'Bông gòn y tế Bạch Tuyết (50g)', N'Gói', 5.0, 30.0, 12000.0, '2027-06-30', 1, GETUTCDATE()),
    (N'Băng dán cá nhân thông khí Urgo', N'Hộp', 3.0, 12.0, 35000.0, '2027-08-15', 1, GETUTCDATE()),
    (N'Cồn y tế sát khuẩn 70 độ (500ml)', N'Chai', 5.0, 15.0, 28000.0, '2026-11-30', 1, GETUTCDATE()), -- Cận hạn nguy cấp (SR-04 Critical)
    (N'Nẹp cố định chấn thương tay chân', N'Cái', 2.0, 8.0, 65000.0, '2029-12-31', 1, GETUTCDATE());

    PRINT N'-> Đã chèn 8 mặt hàng vật tư y tế vào bảng MedicalSupplies.';
END
ELSE
BEGIN
    PRINT N'-> Bảng MedicalSupplies đã có dữ liệu.';
END
GO

-- 3. SEED 2 SỰ CỐ MẪU THỰC TẾ (Nếu bảng IncidentReports chưa có)
IF NOT EXISTS (SELECT 1 FROM dbo.IncidentReports)
BEGIN
    DECLARE @ElderlyId1 INT = (SELECT TOP 1 ElderlyId FROM dbo.ElderlyMembers ORDER BY ElderlyId);
    DECLARE @ElderlyId2 INT = (SELECT TOP 1 ElderlyId FROM dbo.ElderlyMembers WHERE ElderlyId > @ElderlyId1 ORDER BY ElderlyId);
    DECLARE @AdminUserId INT = (SELECT TOP 1 UserId FROM dbo.Users ORDER BY UserId);

    IF (@ElderlyId1 IS NOT NULL AND @AdminUserId IS NOT NULL)
    BEGIN
        -- Ca 1: Sự cố đã xử lý & có phụ phí vật tư (F-14 / D2)
        INSERT INTO dbo.IncidentReports (
            ElderlyId, ReportedBy, IncidentType, Severity, Description,
            OccurredAt, ReportedAt, Status, HandlingActions, ResolutionNotes, ResolvedAt,
            IsSupplyConfirmed, SupplyChargeAmount
        )
        VALUES (
            @ElderlyId1, @AdminUserId,
            N'Té ngã nhẹ tại hành lang', 'Medium',
            N'Cụ bị hụt chân ngã nhẹ ở hành lang phòng sinh hoạt chung, xây xát nhẹ ở đầu gối phải. Đã tiến hành sát trùng bằng Povidine và băng gạc vô trùng.',
            DATEADD(DAY, -2, GETUTCDATE()), DATEADD(DAY, -2, GETUTCDATE()), 'Resolved',
            N'Đỡ cụ ngồi dậy an toàn, kiểm tra xương khớp không gãy, rửa vết thương bằng nước muối sinh lý, sát khuẩn Povidine và đắp gạc vô trùng.',
            N'Cụ tỉnh táo hoàn toàn, đi lại bình thường, vết xước khô ráo.',
            DATEADD(HOUR, 1, DATEADD(DAY, -2, GETUTCDATE())),
            1, 35000.0
        );

        -- Ca 2: Chuyển viện khẩn cấp (SRS 3.9.1 - In phiếu chuyển viện)
        IF (@ElderlyId2 IS NOT NULL)
        BEGIN
            INSERT INTO dbo.IncidentReports (
                ElderlyId, ReportedBy, IncidentType, Severity, Description,
                OccurredAt, ReportedAt, Status, HandlingActions,
                HospitalName, HospitalTransferAt, HospitalEscort, ResolutionNotes,
                IsSupplyConfirmed, SupplyChargeAmount
            )
            VALUES (
                @ElderlyId2, @AdminUserId,
                N'Tụt huyết áp & Khó thở cấp', 'Critical',
                N'Cụ có biểu hiện chóng mặt dữ dội, vã mồ hôi, huyết áp đo được 85/50 mmHg kèm thở dốc. Đã cho thở oxy hỗ trợ và lập tức điều xe chuyển viện cấp cứu.',
                DATEADD(HOUR, -5, GETUTCDATE()), DATEADD(HOUR, -5, GETUTCDATE()), 'InProgress',
                N'Đặt cụ nằm đầu thấp, nới lỏng quần áo, hỗ trợ thở oxy mask 3L/phút, liên hệ khẩn cấp thân nhân và gọi xe cứu thương chuyển viện.',
                N'Bệnh viện Đa khoa Khu vực Thủ Đức', DATEADD(HOUR, -4, GETUTCDATE()), N'Y tá Trần Thị Thảo (Khoa Y tế)',
                N'Đang được các bác sĩ khoa Cấp cứu bệnh viện theo dõi và truyền dịch.',
                0, 0.0
            );
        END

        PRINT N'-> Đã chèn các sự cố mẫu vào bảng IncidentReports.';
    END
END
ELSE
BEGIN
    PRINT N'-> Bảng IncidentReports đã có dữ liệu.';
END
GO

-- 4. LIÊN KẾT TÀI KHOẢN GIA ĐÌNH (family_test@daycare.com) VỚI NGƯỜI CAO TUỔI
DECLARE @FamilyUserId INT = (SELECT TOP 1 UserId FROM dbo.Users WHERE Email = 'family_test@daycare.com');
IF (@FamilyUserId IS NOT NULL)
BEGIN
    DECLARE @FamilyMemberId INT = (SELECT TOP 1 FamilyMemberId FROM dbo.FamilyMembers WHERE UserId = @FamilyUserId);
    IF (@FamilyMemberId IS NULL)
    BEGIN
        INSERT INTO dbo.FamilyMembers (UserId, Address, EmergencyContact)
        VALUES (@FamilyUserId, N'TP. Thủ Đức, TP. Hồ Chí Minh', '0900000003');
        SET @FamilyMemberId = SCOPE_IDENTITY();
    END

    DECLARE @FirstElderlyId INT = (SELECT TOP 1 ElderlyId FROM dbo.ElderlyMembers ORDER BY ElderlyId);
    IF (@FirstElderlyId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.ElderlyFamilyRelationships WHERE FamilyMemberId = @FamilyMemberId))
    BEGIN
        INSERT INTO dbo.ElderlyFamilyRelationships (ElderlyId, FamilyMemberId, Relationship, IsPrimaryContact, CanViewCareLogs, CanReceiveNotifications)
        VALUES (@FirstElderlyId, @FamilyMemberId, N'Con trai', 1, 1, 1);
        PRINT N'-> Đã liên kết tài khoản family_test@daycare.com với người cao tuổi mã: ' + CAST(@FirstElderlyId AS NVARCHAR(10));
    END
END
GO

PRINT N'=== HOÀN TẤT SEED DỮ LIỆU THỰC TẾ CHO DAYCAREELDERLYDB ===';
GO
