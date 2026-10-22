using System.Text.Json;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Elderly;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class ElderlyService : IElderlyService
{
    private readonly AppDbContext _context;
    private static bool _columnsChecked = false;

    public ElderlyService(AppDbContext context)
    {
        _context = context;
    }

    private class MedicalDataWrapper
    {
        public string? Allergies { get; set; }
        public string? MedicalHistory { get; set; }
        public string? MedicalNotes { get; set; }
    }

    private class CareDataWrapper
    {
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string MobilityStatus { get; set; } = "Bình thường";
        public string? CareNotes { get; set; }
    }

    /// <summary>
    /// Đảm bảo các cột mới đã tồn tại trong database và nới lỏng CHECK constraint Gender
    /// </summary>
    private async Task EnsureColumnsAsync()
    {
        if (_columnsChecked) return;

        try
        {
            var syncColumnsSql = @"
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
            await _context.Database.ExecuteSqlRawAsync(syncColumnsSql);
            _columnsChecked = true;
        }
        catch
        {
            // Bỏ qua nếu DB không hỗ trợ hoặc quyền hạn chế
        }
    }

    private static string MapGenderForDb(string? gender)
    {
        if (string.IsNullOrWhiteSpace(gender)) return "Male";
        var g = gender.Trim().ToLowerInvariant();
        if (g == "nam" || g == "male" || g == "m") return "Male";
        if (g == "nữ" || g == "nu" || g == "female" || g == "f") return "Female";
        return "Other";
    }

    private static string MapGenderForDisplay(string? gender)
    {
        if (string.IsNullOrWhiteSpace(gender)) return "Nam";
        var g = gender.Trim().ToLowerInvariant();
        if (g == "male" || g == "nam" || g == "m") return "Nam";
        if (g == "female" || g == "nữ" || g == "nu" || g == "f") return "Nữ";
        return gender;
    }

    public async Task<ApiResponse<ElderlyProfileDto>> CreateElderlyProfileAsync(Guid userId, CreateElderlyProfileDto dto)
    {
        await EnsureColumnsAsync();

        // 1. Kiểm tra User tồn tại
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
        {
            return ApiResponse<ElderlyProfileDto>.Fail("Không tìm thấy thông tin tài khoản người dùng.");
        }

        // 2. Tìm hoặc tạo FamilyMember record cho User
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            familyMember = new FamilyMember
            {
                FamilyMemberId = Guid.NewGuid(),
                UserId = userId,
                Address = dto.Address,
                EmergencyContact = dto.EmergencyContactPhone
            };
            await _context.FamilyMembers.AddAsync(familyMember);
            await _context.SaveChangesAsync();
        }

        // 3. Tìm hoặc tạo Center mặc định
        var center = await _context.Centers.FirstOrDefaultAsync();
        if (center == null)
        {
            center = new Center
            {
                CenterId = Guid.NewGuid(),
                CenterName = "Trung Tâm Chăm Sóc Người Cao Tuổi DayCare",
                Address = "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
                PhoneNumber = "02838123456",
                Email = "contact@daycare.com",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Centers.AddAsync(center);
            await _context.SaveChangesAsync();
        }

        // 4. Lưu trực tiếp các trường chuẩn vào Entity (không lưu JSON vào MedicalNotes)
        var elderly = new ElderlyMember
        {
            ElderlyId = Guid.NewGuid(),
            CenterId = center.CenterId,
            FullName = dto.FullName.Trim(),
            DateOfBirth = dto.DateOfBirth,
            Gender = MapGenderForDb(dto.Gender),
            Address = dto.Address?.Trim(),
            EmergencyContactName = dto.EmergencyContactName.Trim(),
            EmergencyContactPhone = dto.EmergencyContactPhone.Trim(),
            Allergies = dto.Allergies?.Trim(),
            MedicalHistory = dto.MedicalHistory?.Trim(),
            MedicalNotes = dto.MedicalNotes?.Trim(), // Lưu thuần text, không lưu JSON
            MobilityStatus = dto.MobilityStatus.Trim(),
            CareNotes = dto.CareNotes?.Trim(),
            EmergencyNotes = dto.CareNotes?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ElderlyMembers.AddAsync(elderly);

        // 5. Tạo liên kết ElderlyFamilyRelationship
        var relationship = new ElderlyFamilyRelationship
        {
            ElderlyId = elderly.ElderlyId,
            FamilyMemberId = familyMember.FamilyMemberId,
            Relationship = dto.Relationship.Trim(),
            IsPrimaryContact = true,
            CanViewCareLogs = true,
            CanReceiveNotifications = true
        };

        await _context.ElderlyFamilyRelationships.AddAsync(relationship);
        await _context.SaveChangesAsync();

        var resultDto = MapToDto(elderly, relationship.Relationship, center.CenterName);
        return ApiResponse<ElderlyProfileDto>.Ok(resultDto, "Tạo hồ sơ người cao tuổi thành công.");
    }

    public async Task<ApiResponse<List<ElderlyProfileDto>>> GetMyElderlyProfilesAsync(Guid userId)
    {
        await EnsureColumnsAsync();

        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<List<ElderlyProfileDto>>.Ok(new List<ElderlyProfileDto>(), "Chưa có hồ sơ người thân.");
        }

        var relationships = await _context.ElderlyFamilyRelationships
            .Include(r => r.Elderly)
                .ThenInclude(e => e.Center)
            .Where(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.Elderly.IsActive)
            .OrderByDescending(r => r.Elderly.CreatedAt)
            .ToListAsync();

        var list = new List<ElderlyProfileDto>();
        foreach (var rel in relationships)
        {
            var e = rel.Elderly;
            list.Add(MapToDto(e, rel.Relationship, e.Center?.CenterName ?? "DayCare Center"));
        }

        return ApiResponse<List<ElderlyProfileDto>>.Ok(list);
    }

    public async Task<ApiResponse<ElderlyProfileDto>> GetElderlyProfileByIdAsync(Guid userId, Guid elderlyId)
    {
        await EnsureColumnsAsync();

        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<ElderlyProfileDto>.Fail("Không tìm thấy thông tin gia đình.");
        }

        var rel = await _context.ElderlyFamilyRelationships
            .Include(r => r.Elderly)
                .ThenInclude(e => e.Center)
            .FirstOrDefaultAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderlyId);

        if (rel == null || !rel.Elderly.IsActive)
        {
            return ApiResponse<ElderlyProfileDto>.Fail("Không tìm thấy hồ sơ người cao tuổi này.");
        }

        var e = rel.Elderly;
        var dto = MapToDto(e, rel.Relationship, e.Center?.CenterName ?? "DayCare Center");
        return ApiResponse<ElderlyProfileDto>.Ok(dto);
    }

    public async Task<ApiResponse<ElderlyProfileDto>> UpdateElderlyProfileAsync(Guid userId, Guid elderlyId, UpdateElderlyProfileDto dto)
    {
        await EnsureColumnsAsync();

        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<ElderlyProfileDto>.Fail("Không tìm thấy thông tin gia đình.");
        }

        var rel = await _context.ElderlyFamilyRelationships
            .Include(r => r.Elderly)
                .ThenInclude(e => e.Center)
            .FirstOrDefaultAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderlyId);

        if (rel == null || !rel.Elderly.IsActive)
        {
            return ApiResponse<ElderlyProfileDto>.Fail("Không tìm thấy hồ sơ người cao tuổi cần chỉnh sửa.");
        }

        var e = rel.Elderly;

        // Cập nhật thông tin
        e.FullName = dto.FullName.Trim();
        e.DateOfBirth = dto.DateOfBirth;
        e.Gender = MapGenderForDb(dto.Gender);
        e.Address = dto.Address?.Trim();
        e.EmergencyContactName = dto.EmergencyContactName.Trim();
        e.EmergencyContactPhone = dto.EmergencyContactPhone.Trim();
        e.Allergies = dto.Allergies?.Trim();
        e.MedicalHistory = dto.MedicalHistory?.Trim();
        e.MedicalNotes = dto.MedicalNotes?.Trim();
        e.MobilityStatus = dto.MobilityStatus.Trim();
        e.CareNotes = dto.CareNotes?.Trim();
        e.EmergencyNotes = dto.CareNotes?.Trim();

        rel.Relationship = dto.Relationship.Trim();

        await _context.SaveChangesAsync();

        var resultDto = MapToDto(e, rel.Relationship, e.Center?.CenterName ?? "DayCare Center");
        return ApiResponse<ElderlyProfileDto>.Ok(resultDto, "Cập nhật hồ sơ người cao tuổi thành công.");
    }

    public async Task<ApiResponse<bool>> DeleteElderlyProfileAsync(Guid userId, Guid elderlyId)
    {
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy thông tin gia đình.");
        }

        var rel = await _context.ElderlyFamilyRelationships
            .Include(r => r.Elderly)
            .FirstOrDefaultAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderlyId);

        if (rel == null || !rel.Elderly.IsActive)
        {
            return ApiResponse<bool>.Fail("Hồ sơ không tồn tại hoặc đã bị xóa.");
        }

        // Soft delete hồ sơ
        rel.Elderly.IsActive = false;
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Xóa hồ sơ người cao tuổi thành công.");
    }

    private static MedicalDataWrapper ParseMedicalData(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new MedicalDataWrapper();
        try
        {
            return JsonSerializer.Deserialize<MedicalDataWrapper>(json) ?? new MedicalDataWrapper();
        }
        catch
        {
            return new MedicalDataWrapper { MedicalNotes = json };
        }
    }

    private static CareDataWrapper ParseCareData(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new CareDataWrapper();
        try
        {
            return JsonSerializer.Deserialize<CareDataWrapper>(json) ?? new CareDataWrapper();
        }
        catch
        {
            return new CareDataWrapper { CareNotes = json };
        }
    }

    private static ElderlyProfileDto MapToDto(
        ElderlyMember e,
        string relationship,
        string centerName)
    {
        int? age = null;
        if (e.DateOfBirth.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            age = today.Year - e.DateOfBirth.Value.Year;
            if (e.DateOfBirth.Value > today.AddYears(-age.Value))
            {
                age--;
            }
        }

        // Làm sạch MedicalNotes: Nếu dữ liệu cũ là JSON thì parse lấy text, không để lộ JSON ra màn hình
        string? cleanAllergies = e.Allergies;
        string? cleanMedicalHistory = e.MedicalHistory;
        string? cleanMedicalNotes = e.MedicalNotes;

        if (!string.IsNullOrWhiteSpace(e.MedicalNotes) && e.MedicalNotes.TrimStart().StartsWith("{"))
        {
            var parsedMed = ParseMedicalData(e.MedicalNotes);
            if (string.IsNullOrWhiteSpace(cleanAllergies)) cleanAllergies = parsedMed.Allergies;
            if (string.IsNullOrWhiteSpace(cleanMedicalHistory)) cleanMedicalHistory = parsedMed.MedicalHistory;
            cleanMedicalNotes = parsedMed.MedicalNotes;
        }

        // Làm sạch CareNotes / MobilityStatus
        string? cleanContactName = e.EmergencyContactName;
        string? cleanContactPhone = e.EmergencyContactPhone;
        string cleanMobility = !string.IsNullOrWhiteSpace(e.MobilityStatus) ? e.MobilityStatus : "Bình thường";
        string? cleanCareNotes = e.CareNotes;

        if (!string.IsNullOrWhiteSpace(e.EmergencyNotes) && e.EmergencyNotes.TrimStart().StartsWith("{"))
        {
            var parsedCare = ParseCareData(e.EmergencyNotes);
            if (string.IsNullOrWhiteSpace(cleanContactName)) cleanContactName = parsedCare.EmergencyContactName;
            if (string.IsNullOrWhiteSpace(cleanContactPhone)) cleanContactPhone = parsedCare.EmergencyContactPhone;
            if (string.IsNullOrWhiteSpace(e.MobilityStatus) && !string.IsNullOrWhiteSpace(parsedCare.MobilityStatus))
            {
                cleanMobility = parsedCare.MobilityStatus;
            }
            if (string.IsNullOrWhiteSpace(cleanCareNotes)) cleanCareNotes = parsedCare.CareNotes;
        }

        return new ElderlyProfileDto
        {
            ElderlyId = e.ElderlyId,
            CenterId = e.CenterId,
            CenterName = centerName,
            FullName = e.FullName,
            DateOfBirth = e.DateOfBirth,
            Age = age,
            Gender = MapGenderForDisplay(e.Gender),
            Address = e.Address,
            Relationship = relationship,
            EmergencyContactName = cleanContactName ?? string.Empty,
            EmergencyContactPhone = cleanContactPhone ?? string.Empty,
            Allergies = cleanAllergies,
            MedicalHistory = cleanMedicalHistory,
            MedicalNotes = cleanMedicalNotes, // Trả về text sạch, không bao giờ là chuỗi JSON
            MobilityStatus = cleanMobility,
            CareNotes = cleanCareNotes,
            IsActive = e.IsActive,
            CreatedAt = e.CreatedAt
        };
    }
}
