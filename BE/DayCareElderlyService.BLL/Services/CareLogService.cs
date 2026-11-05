using System.Globalization;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Unicode;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.CareLog;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class CareLogService : ICareLogService
{
    private readonly AppDbContext _context;
    private readonly IImageStorageService _imageStorage;

    private const int MaxPhotosPerEntry = 5;
    private const long MaxPhotoBytes = 5 * 1024 * 1024;
    private static readonly string[] PhotoExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] PhotoContentTypes = { "image/jpeg", "image/png", "image/webp" };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public CareLogService(AppDbContext context, IImageStorageService imageStorage)
    {
        _context = context;
        _imageStorage = imageStorage;
    }

    // ===== Danh sách cụ & xem care log =====

    public async Task<ApiResponse<List<StaffElderlyTodayDto>>> GetTodayElderlyAsync(int userId)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<List<StaffElderlyTodayDto>>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var today = VietnamTime.Today;
        var (from, to) = VietnamTime.DayRange(today);

        var attendances = await _context.AttendanceRecords
            .Include(a => a.Elderly)
            .Where(a => a.AttendanceDate == today && a.CheckInAt != null
                     && a.Elderly.IsActive)
            .ToListAsync();

        var elderlyIds = attendances.Select(a => a.ElderlyId).Distinct().ToList();
        var logs = await _context.CareLogs
            .Where(c => elderlyIds.Contains(c.ElderlyId) && c.RecordedAt >= from && c.RecordedAt < to)
            .Select(c => new { c.ElderlyId, c.CareType, c.RecordedAt })
            .ToListAsync();

        var result = attendances
            .GroupBy(a => a.ElderlyId)
            .Select(g =>
            {
                var attendance = g.OrderBy(a => a.CheckInAt).First();
                var elderlyLogs = logs.Where(l => l.ElderlyId == g.Key).ToList();
                return new StaffElderlyTodayDto
                {
                    ElderlyId = g.Key,
                    FullName = attendance.Elderly.FullName,
                    DateOfBirth = attendance.Elderly.DateOfBirth,
                    Gender = attendance.Elderly.Gender,
                    MobilityStatus = attendance.Elderly.MobilityStatus,
                    Allergies = attendance.Elderly.Allergies,
                    CheckInAt = attendance.CheckInAt,
                    CheckOutAt = attendance.CheckOutAt,
                    EntryCount = elderlyLogs.Count,
                    LastRecordedAt = elderlyLogs.Count > 0 ? elderlyLogs.Max(l => l.RecordedAt) : null,
                    IsMedicalDone = elderlyLogs.Any(l => l.CareType == CareLogTypes.MedicalDone),
                    IsClosed = elderlyLogs.Any(l => l.CareType == CareLogTypes.Close)
                };
            })
            .OrderBy(e => e.FullName)
            .ToList();

        return ApiResponse<List<StaffElderlyTodayDto>>.Ok(result, "Lấy danh sách người cao tuổi hôm nay thành công.");
    }

    public async Task<ApiResponse<CareLogDayDto>> GetDayAsync(int userId, int elderlyId, DateOnly? date)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<CareLogDayDto>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var elderly = await GetElderlyInCenterAsync(staff, elderlyId);
        if (elderly == null)
        {
            return ApiResponse<CareLogDayDto>.Fail("Không tìm thấy người cao tuổi trong trung tâm của bạn.");
        }

        var day = await CareLogShared.BuildDayAsync(_context, elderly, date ?? VietnamTime.Today, includeInternal: true);
        return ApiResponse<CareLogDayDto>.Ok(day, "Lấy care log thành công.");
    }

    // ===== Ghi care log =====

    public async Task<ApiResponse<CareLogEntryDto>> AddEntryAsync(int userId, int elderlyId, CreateCareLogEntryDto dto)
    {
        var careType = dto.CareType.Trim().ToUpperInvariant();
        if (!CareLogTypes.Manual.Contains(careType))
        {
            return ApiResponse<CareLogEntryDto>.Fail(
                $"Loại mục không hợp lệ. Chọn một trong: {string.Join(", ", CareLogTypes.Manual)}.");
        }

        var (staff, elderly, error) = await GetWritableAsync(userId, elderlyId);
        if (error != null)
        {
            return ApiResponse<CareLogEntryDto>.Fail(error);
        }

        var log = NewLog(staff!, elderly!.ElderlyId, careType, dto.Description.Trim(), dto.Notes, ToJson(dto.Data), dto.IsInternal);
        await _context.CareLogs.AddAsync(log);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "CREATE_CARE_LOG", nameof(CareLog), log.CareLogId.ToString(), new
        {
            ElderlyId = elderlyId,
            CareType = careType,
            dto.IsInternal
        });

        return ApiResponse<CareLogEntryDto>.Ok(CareLogShared.ToEntryDto(log), "Ghi care log thành công.");
    }

    // ===== Ảnh =====

    public async Task<ApiResponse<List<CareLogPhotoDto>>> AddPhotosAsync(int userId, int careLogId, List<PhotoUploadFile> files)
    {
        if (files.Count == 0)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail("Vui lòng chọn ít nhất một ảnh.");
        }

        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!PhotoExtensions.Contains(extension) || !PhotoContentTypes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return ApiResponse<List<CareLogPhotoDto>>.Fail($"Ảnh \"{file.FileName}\" không hợp lệ. Chỉ nhận jpg, png, webp.");
            }
            if (file.Length == 0 || file.Length > MaxPhotoBytes)
            {
                return ApiResponse<List<CareLogPhotoDto>>.Fail($"Ảnh \"{file.FileName}\" phải lớn hơn 0 và tối đa 5MB.");
            }
        }

        await CareLogSchema.EnsureColumnsAsync(_context);
        var log = await _context.CareLogs
            .Include(c => c.CareLogPhotos)
            .FirstOrDefaultAsync(c => c.CareLogId == careLogId);
        if (log == null)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail("Không tìm thấy mục care log.");
        }

        if (log.CareType == CareLogTypes.MedicalDone || log.CareType == CareLogTypes.Close)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail("Không đính kèm ảnh cho mục xác nhận / chốt ngày.");
        }

        if (DateOnly.FromDateTime(log.RecordedAt) != VietnamTime.Today)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail("Chỉ đính kèm ảnh cho mục care log hôm nay.");
        }

        var (_, _, error) = await GetWritableAsync(userId, log.ElderlyId);
        if (error != null)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail(error);
        }

        if (log.CareLogPhotos.Count + files.Count > MaxPhotosPerEntry)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail(
                $"Mỗi mục tối đa {MaxPhotosPerEntry} ảnh (đã có {log.CareLogPhotos.Count}).");
        }

        if (!_imageStorage.IsConfigured)
        {
            return ApiResponse<List<CareLogPhotoDto>>.Fail("Máy chủ chưa cấu hình Cloudinary, chưa thể tải ảnh.");
        }

        // Upload lần lượt; lỗi giữa chừng thì xoá các ảnh đã lên Cloudinary
        var photos = new List<CareLogPhoto>();
        try
        {
            foreach (var file in files)
            {
                var photoId = Random.Shared.Next(100000, 999999);
                var url = await _imageStorage.UploadAsync(file.Content, file.FileName, _imageStorage.CareLogPhotoPublicId(photoId));
                photos.Add(new CareLogPhoto
                {
                    CareLogId = log.CareLogId,
                    FileUrl = url,
                    UploadedAt = VietnamTime.Now
                });
            }
        }
        catch (InvalidOperationException ex)
        {
            foreach (var photo in photos)
            {
                await _imageStorage.DeleteAsync(_imageStorage.CareLogPhotoPublicId(photo.CareLogPhotoId));
            }
            return ApiResponse<List<CareLogPhotoDto>>.Fail(ex.Message);
        }

        await _context.CareLogPhotos.AddRangeAsync(photos);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "UPLOAD_CARE_LOG_PHOTOS", nameof(CareLog), log.CareLogId.ToString(), new
        {
            PhotoCount = photos.Count
        });

        return ApiResponse<List<CareLogPhotoDto>>.Ok(photos.Select(CareLogShared.ToPhotoDto).ToList(), "Tải ảnh thành công.");
    }

    public async Task<ApiResponse<bool>> DeletePhotoAsync(int userId, int photoId)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);
        var photo = await _context.CareLogPhotos
            .Include(p => p.CareLog)
            .FirstOrDefaultAsync(p => p.CareLogPhotoId == photoId);
        if (photo == null)
        {
            return ApiResponse<bool>.Fail("Không tìm thấy ảnh.");
        }

        if (DateOnly.FromDateTime(photo.CareLog.RecordedAt) != VietnamTime.Today)
        {
            return ApiResponse<bool>.Fail("Chỉ xoá được ảnh của care log hôm nay.");
        }

        var (_, _, error) = await GetWritableAsync(userId, photo.CareLog.ElderlyId);
        if (error != null)
        {
            return ApiResponse<bool>.Fail(error);
        }

        _context.CareLogPhotos.Remove(photo);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "DELETE_CARE_LOG_PHOTO", nameof(CareLogPhoto), photoId.ToString(), new
        {
            CareLogId = photo.CareLogId
        });
        await _imageStorage.DeleteAsync(_imageStorage.CareLogPhotoPublicId(photo.CareLogPhotoId));

        return ApiResponse<bool>.Ok(true, "Xoá ảnh thành công.");
    }

    public async Task<ApiResponse<VitalsResultDto>> RecordVitalsAsync(int userId, int elderlyId, RecordVitalsDto dto)
    {
        if (dto.SystolicBp == null && dto.DiastolicBp == null && dto.HeartRate == null
            && dto.SpO2 == null && dto.Temperature == null && dto.BloodGlucose == null)
        {
            return ApiResponse<VitalsResultDto>.Fail("Vui lòng nhập ít nhất một chỉ số.");
        }

        var (staff, elderly, error) = await GetWritableAsync(userId, elderlyId);
        if (error != null)
        {
            return ApiResponse<VitalsResultDto>.Fail(error);
        }

        var (warnings, severity) = CheckVitals(dto);
        var data = JsonSerializer.Serialize(new
        {
            dto.SystolicBp,
            dto.DiastolicBp,
            dto.HeartRate,
            dto.SpO2,
            dto.Temperature,
            dto.BloodGlucose,
            Warnings = warnings.Count > 0 ? warnings : null,
            Severity = severity
        }, JsonOptions);

        var log = NewLog(staff!, elderly!.ElderlyId, CareLogTypes.Vitals, DescribeVitals(dto), dto.Notes, data, false);
        if (dto.SystolicBp.HasValue || dto.DiastolicBp.HasValue)
        {
            log.BloodPressure = $"{dto.SystolicBp?.ToString() ?? "?"}/{dto.DiastolicBp?.ToString() ?? "?"}";
        }
        if (dto.BloodGlucose.HasValue)
        {
            log.BloodGlucose = dto.BloodGlucose.Value;
        }
        await _context.CareLogs.AddAsync(log);

        IncidentReport? incident = null;
        if (severity != null)
        {
            incident = new IncidentReport
            {
                ElderlyId = elderly.ElderlyId,
                ReportedBy = staff!.UserId,
                IncidentType = IncidentTypes.VitalsAlert,
                Severity = severity,
                Description = "Chỉ số vượt ngưỡng: " + string.Join("; ", warnings),
                OccurredAt = log.RecordedAt,
                ReportedAt = log.RecordedAt,
                Status = IncidentStatuses.Open
            };
            await _context.IncidentReports.AddAsync(incident);

            await CareLogShared.NotifyFamilyAsync(_context, elderly.ElderlyId,
                $"Cảnh báo chỉ số của {elderly.FullName}",
                string.Join("; ", warnings),
                "Vitals", nameof(IncidentReport), incident.IncidentId);
        }

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "RECORD_VITALS", nameof(CareLog), log.CareLogId.ToString(), new
        {
            ElderlyId = elderlyId,
            HasWarnings = warnings.Count > 0,
            WarningCount = warnings.Count,
            IncidentId = incident?.IncidentId
        });

        var result = new VitalsResultDto
        {
            Entry = CareLogShared.ToEntryDto(log),
            Warnings = warnings,
            Severity = severity,
            IncidentId = incident?.IncidentId
        };
        var message = severity == null ? "Ghi chỉ số thành công." : "Ghi chỉ số thành công. Có chỉ số vượt ngưỡng, đã tạo cảnh báo.";
        return ApiResponse<VitalsResultDto>.Ok(result, message);
    }

    // ===== Thuốc =====

    public async Task<ApiResponse<List<DoseDto>>> GetTodayDosesAsync(int userId, string? status = null)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<List<DoseDto>>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var (from, to) = VietnamTime.DayRange(VietnamTime.Today);
        var query = CareLogShared.DoseQuery(_context)
            .Where(r => r.ScheduledAt >= from && r.ScheduledAt < to);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalized = NormalizeStatus(status, DoseStatuses.Pending, DoseStatuses.Given, DoseStatuses.Refused, DoseStatuses.Missed);
            if (normalized == null)
            {
                return ApiResponse<List<DoseDto>>.Fail("Trạng thái không hợp lệ. Chọn Pending, Given, Refused hoặc Missed.");
            }
            query = query.Where(r => r.Status == normalized);
        }

        var records = await query
            .OrderBy(r => r.ScheduledAt)
            .ToListAsync();

        return ApiResponse<List<DoseDto>>.Ok(records.Select(CareLogShared.ToDoseDto).ToList(), "Lấy danh sách thuốc hôm nay thành công.");
    }

    public async Task<ApiResponse<DoseDto>> UpdateDoseAsync(int userId, int medicationRecordId, UpdateDoseDto dto)
    {
        var status = NormalizeStatus(dto.Status, DoseStatuses.Given, DoseStatuses.Refused, DoseStatuses.Missed);
        if (status == null)
        {
            return ApiResponse<DoseDto>.Fail("Trạng thái không hợp lệ. Chọn Given, Refused hoặc Missed.");
        }

        if (status != DoseStatuses.Given && string.IsNullOrWhiteSpace(dto.Notes))
        {
            return ApiResponse<DoseDto>.Fail("Vui lòng nhập lý do khi cụ từ chối uống hoặc thiếu thuốc.");
        }

        var record = await CareLogShared.DoseQuery(_context)
            .FirstOrDefaultAsync(r => r.MedicationRecordId == medicationRecordId);
        if (record == null)
        {
            return ApiResponse<DoseDto>.Fail("Không tìm thấy liều thuốc.");
        }

        var (staff, elderly, error) = await GetWritableAsync(userId, record.MedicationPlan.ElderlyId);
        if (error != null)
        {
            return ApiResponse<DoseDto>.Fail(error);
        }

        if (record.Status != DoseStatuses.Pending)
        {
            return ApiResponse<DoseDto>.Fail($"Liều thuốc này đã được ghi nhận: {DoseStatuses.Label(record.Status)}.");
        }

        var now = VietnamTime.Now;
        record.Status = status;
        record.RecordedAt = now;
        record.StaffId = staff!.UserId;
        record.Staff = staff;
        record.Notes = dto.Notes?.Trim();

        var plan = record.MedicationPlan;
        var data = JsonSerializer.Serialize(new
        {
            record.MedicationRecordId,
            plan.MedicationName,
            plan.Dosage,
            record.ScheduledAt,
            Status = status
        }, JsonOptions);
        var log = NewLog(staff, elderly!.ElderlyId, CareLogTypes.Medication,
            $"{plan.MedicationName} {plan.Dosage}: {DoseStatuses.Label(status)}", record.Notes, data, false);
        await _context.CareLogs.AddAsync(log);

        if (status != DoseStatuses.Given)
        {
            await CareLogShared.NotifyFamilyAsync(_context, elderly.ElderlyId,
                $"{elderly.FullName}: {DoseStatuses.Label(status).ToLowerInvariant()}",
                $"{plan.MedicationName} {plan.Dosage} lúc {record.ScheduledAt:HH:mm}. Lý do: {record.Notes}",
                "Medication", nameof(MedicationRecord), record.MedicationRecordId);
        }

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "UPDATE_MEDICATION_DOSE", nameof(MedicationRecord), record.MedicationRecordId.ToString(), new
        {
            ElderlyId = elderly.ElderlyId,
            Status = record.Status
        });
        return ApiResponse<DoseDto>.Ok(CareLogShared.ToDoseDto(record), "Ghi nhận thuốc thành công.");
    }

    // ===== Sự cố & cảnh báo =====

    public async Task<ApiResponse<List<IncidentDto>>> GetIncidentsAsync(int userId, string? status, int days)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<List<IncidentDto>>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var from = VietnamTime.Now.AddDays(-Math.Clamp(days, 1, 90));
        var query = CareLogShared.IncidentQuery(_context)
            .Where(i => i.ReportedAt >= from);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(i => i.Status == status);
        }

        var incidents = await query.OrderByDescending(i => i.ReportedAt).ToListAsync();
        return ApiResponse<List<IncidentDto>>.Ok(incidents.Select(CareLogShared.ToIncidentDto).ToList(), "Lấy danh sách sự cố thành công.");
    }

    public async Task<ApiResponse<IncidentDto>> CreateIncidentAsync(int userId, CreateIncidentDto dto)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<IncidentDto>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var elderly = await GetElderlyInCenterAsync(staff, dto.ElderlyId);
        if (elderly == null)
        {
            return ApiResponse<IncidentDto>.Fail("Không tìm thấy người cao tuổi trong trung tâm của bạn.");
        }

        var incidentType = dto.IncidentType.Trim();
        var isUrgent = IncidentTypes.Urgent.Contains(incidentType.ToUpperInvariant());
        if (isUrgent)
        {
            incidentType = incidentType.ToUpperInvariant();
        }

        string? severity;
        if (isUrgent)
        {
            severity = IncidentSeverities.Critical;
        }
        else if (string.IsNullOrWhiteSpace(dto.Severity))
        {
            severity = IncidentSeverities.Medium;
        }
        else
        {
            severity = NormalizeStatus(dto.Severity, IncidentSeverities.All);
            if (severity == null)
            {
                return ApiResponse<IncidentDto>.Fail($"Mức độ không hợp lệ. Chọn một trong: {string.Join(", ", IncidentSeverities.All)}.");
            }
        }

        var now = VietnamTime.Now;
        var occurredAt = dto.OccurredAt ?? now;
        if (occurredAt > now.AddMinutes(5))
        {
            return ApiResponse<IncidentDto>.Fail("Thời điểm xảy ra không được ở tương lai.");
        }

        var incident = new IncidentReport
        {
            ElderlyId = elderly.ElderlyId,
            ReportedBy = staff.UserId,
            IncidentType = incidentType,
            Severity = severity,
            Description = dto.Description.Trim(),
            OccurredAt = occurredAt,
            ReportedAt = now,
            Status = IncidentStatuses.Open,
            Elderly = elderly,
            ReportedByNavigation = staff
        };
        await _context.IncidentReports.AddAsync(incident);

        await CareLogShared.NotifyFamilyAsync(_context, elderly.ElderlyId,
            isUrgent ? $"KHẨN CẤP: {elderly.FullName}" : $"Sự cố của {elderly.FullName}",
            incident.Description,
            "Incident", nameof(IncidentReport), incident.IncidentId);

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "CREATE_INCIDENT", nameof(IncidentReport), incident.IncidentId.ToString(), new
        {
            ElderlyId = elderly.ElderlyId,
            IncidentType = incident.IncidentType,
            Severity = incident.Severity
        });
        return ApiResponse<IncidentDto>.Ok(CareLogShared.ToIncidentDto(incident), "Báo sự cố thành công.");
    }

    public async Task<ApiResponse<IncidentDto>> UpdateIncidentAsync(int userId, int incidentId, UpdateIncidentDto dto)
    {
        var status = NormalizeStatus(dto.Status, IncidentStatuses.InProgress, IncidentStatuses.Resolved);
        if (status == null)
        {
            return ApiResponse<IncidentDto>.Fail("Trạng thái không hợp lệ. Chọn InProgress hoặc Resolved.");
        }

        if (status == IncidentStatuses.Resolved && string.IsNullOrWhiteSpace(dto.ResolutionNotes))
        {
            return ApiResponse<IncidentDto>.Fail("Vui lòng nhập kết quả xử lý khi đóng sự cố.");
        }

        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return ApiResponse<IncidentDto>.Fail("Tài khoản chưa có hồ sơ nhân viên.");
        }

        var incident = await CareLogShared.IncidentQuery(_context)
            .FirstOrDefaultAsync(i => i.IncidentId == incidentId);
        if (incident == null)
        {
            return ApiResponse<IncidentDto>.Fail("Không tìm thấy sự cố trong trung tâm của bạn.");
        }

        if (incident.Status == IncidentStatuses.Resolved)
        {
            return ApiResponse<IncidentDto>.Fail("Sự cố đã được đóng.");
        }

        incident.Status = status;
        if (!string.IsNullOrWhiteSpace(dto.ResolutionNotes))
        {
            incident.ResolutionNotes = dto.ResolutionNotes.Trim();
        }
        if (status == IncidentStatuses.Resolved)
        {
            incident.ResolvedAt = VietnamTime.Now;
        }

        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "UPDATE_INCIDENT", nameof(IncidentReport), incident.IncidentId.ToString(), new
        {
            Status = incident.Status
        });
        return ApiResponse<IncidentDto>.Ok(CareLogShared.ToIncidentDto(incident), "Cập nhật sự cố thành công.");
    }

    // ===== Helpers =====

    private async Task<User?> GetStaffAsync(int userId)
    {
        await CareLogSchema.EnsureColumnsAsync(_context);
        return await _context.Users
            .Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.UserId == userId && u.Roles.Any(r => r.RoleName == "Staff" || r.RoleName == "Admin"));
    }

    private Task<ElderlyMember?> GetElderlyInCenterAsync(User staff, int elderlyId) =>
        _context.ElderlyMembers.FirstOrDefaultAsync(e => e.ElderlyId == elderlyId && e.IsActive);

    /// <summary>
    /// Kiểm tra trước khi ghi: là staff và cụ đã check-in hôm nay
    /// </summary>
    private async Task<(User? Staff, ElderlyMember? Elderly, string? Error)> GetWritableAsync(int userId, int elderlyId)
    {
        var staff = await GetStaffAsync(userId);
        if (staff == null)
        {
            return (null, null, "Tài khoản chưa có hồ sơ nhân viên.");
        }

        var elderly = await GetElderlyInCenterAsync(staff, elderlyId);
        if (elderly == null)
        {
            return (staff, null, "Không tìm thấy người cao tuổi.");
        }

        var today = VietnamTime.Today;
        var checkedIn = await _context.AttendanceRecords
            .AnyAsync(a => a.ElderlyId == elderlyId && a.AttendanceDate == today && a.CheckInAt != null);
        if (!checkedIn)
        {
            return (staff, elderly, "Người cao tuổi chưa check-in hôm nay.");
        }

        return (staff, elderly, null);
    }

    private Task<bool> HasTodayAsync(int elderlyId, string careType)
    {
        var (from, to) = VietnamTime.DayRange(VietnamTime.Today);
        return _context.CareLogs.AnyAsync(c => c.ElderlyId == elderlyId && c.CareType == careType
                                            && c.RecordedAt >= from && c.RecordedAt < to);
    }

    private static CareLog NewLog(User staff, int elderlyId, string careType, string description, string? notes, string? data, bool isInternal) => new()
    {
        ElderlyId = elderlyId,
        StaffId = staff.UserId,
        Staff = staff,
        RecordedAt = VietnamTime.Now,
        CareType = careType,
        Description = description,
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
        Data = data,
        IsInternal = isInternal
    };

    private static string? ToJson(JsonElement? element) =>
        element is { ValueKind: not (JsonValueKind.Undefined or JsonValueKind.Null) } e ? e.GetRawText() : null;

    /// <summary>Trả về giá trị chuẩn (đúng hoa thường) nếu value nằm trong allowed, ngược lại null</summary>
    private static string? NormalizeStatus(string? value, params string[] allowed) =>
        allowed.FirstOrDefault(a => string.Equals(a, value?.Trim(), StringComparison.OrdinalIgnoreCase));

    private static string DescribeVitals(RecordVitalsDto dto)
    {
        var parts = new List<string>();
        if (dto.SystolicBp != null || dto.DiastolicBp != null)
            parts.Add($"HA {dto.SystolicBp?.ToString() ?? "?"}/{dto.DiastolicBp?.ToString() ?? "?"} mmHg");
        if (dto.HeartRate != null) parts.Add($"Mạch {dto.HeartRate} l/p");
        if (dto.SpO2 != null) parts.Add($"SpO2 {dto.SpO2}%");
        if (dto.Temperature != null) parts.Add($"Nhiệt độ {dto.Temperature.Value.ToString(CultureInfo.InvariantCulture)}°C");
        if (dto.BloodGlucose != null) parts.Add($"Đường huyết {dto.BloodGlucose.Value.ToString(CultureInfo.InvariantCulture)} mmol/L");
        return string.Join(" · ", parts);
    }

    /// <summary>
    /// So ngưỡng mặc định cho người cao tuổi. Medium = cần theo dõi (v &lt; lowWarn hoặc v &gt;= highWarn),
    /// High = nguy hiểm (v &lt; lowDanger hoặc v &gt;= highDanger).
    /// </summary>
    private static (List<string> Warnings, string? Severity) CheckVitals(RecordVitalsDto dto)
    {
        var warnings = new List<string>();
        string? severity = null;

        void Check(decimal? value, string label, string unit, decimal lowWarn, decimal highWarn, decimal lowDanger, decimal highDanger)
        {
            if (value == null) return;
            var v = value.Value;
            string? level = v < lowDanger || v >= highDanger ? IncidentSeverities.High
                          : v < lowWarn || v >= highWarn ? IncidentSeverities.Medium
                          : null;
            if (level == null) return;

            var direction = v < lowWarn ? "thấp" : "cao";
            warnings.Add($"{label} {direction} ({v.ToString(CultureInfo.InvariantCulture)} {unit})");
            if (IncidentSeverities.Rank(level) > IncidentSeverities.Rank(severity))
            {
                severity = level;
            }
        }

        Check(dto.SystolicBp, "Huyết áp tâm thu", "mmHg", 90, 140, 80, 180);
        Check(dto.DiastolicBp, "Huyết áp tâm trương", "mmHg", 60, 90, 50, 110);
        Check(dto.HeartRate, "Nhịp tim", "lần/phút", 50, 110, 40, 130);
        Check(dto.SpO2, "SpO2", "%", 95, 101, 90, 101);
        Check(dto.Temperature, "Nhiệt độ", "°C", 35.5m, 37.5m, 35m, 39m);
        Check(dto.BloodGlucose, "Đường huyết", "mmol/L", 3.9m, 11.1m, 3m, 16.7m);

        return (warnings, severity);
    }
}
