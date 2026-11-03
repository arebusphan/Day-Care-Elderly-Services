using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Billing;
using DayCareElderlyService.BLL.Services.Interfaces;
using DayCareElderlyService.Models.Data;
using DayCareElderlyService.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Services;

public class BillingService : IBillingService
{
    private readonly AppDbContext _context;

    public BillingService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ApiResponse<List<ServicePackageDto>>> GetActivePackagesAsync()
    {
        var packages = await _context.ServicePackages
            .Where(p => p.IsActive)
            .OrderBy(p => p.PricePerDay)
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dtos = new List<ServicePackageDto>();

        foreach (var pkg in packages)
        {
            // Tính số suất đang đăng ký hoạt động
            var activeBookings = await _context.ServiceRegistrations
                .CountAsync(r => r.PackageId == pkg.PackageId && r.Status == "Confirmed" && (r.EndDate == null || r.EndDate >= today));

            var available = Math.Max(0, pkg.TotalSlots - activeBookings);

            var highlights = string.IsNullOrWhiteSpace(pkg.Highlights)
                ? new List<string>()
                : pkg.Highlights.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            var included = string.IsNullOrWhiteSpace(pkg.IncludedServices)
                ? new List<string>()
                : pkg.IncludedServices.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            dtos.Add(new ServicePackageDto
            {
                PackageId = pkg.PackageId,
                PackageName = pkg.PackageName,
                Description = pkg.Description,
                Price = pkg.Price,
                BillingPeriod = pkg.BillingPeriod,
                PricePerDay = pkg.PricePerDay,
                PriceMonth3Days = pkg.PriceMonth3Days,
                PriceMonthFullWeek = pkg.PriceMonthFullWeek,
                Highlights = highlights,
                IncludedServices = included,
                TargetAudience = pkg.TargetAudience,
                PricingNote = pkg.PricingNote,
                TotalSlots = pkg.TotalSlots,
                AvailableSlots = available,
                EndOfLifeRoomIncluded = pkg.EndOfLifeRoomIncluded,
                IsActive = pkg.IsActive
            });
        }

        return ApiResponse<List<ServicePackageDto>>.Ok(dtos, "Lấy danh sách gói dịch vụ thành công.");
    }

    public async Task<ApiResponse<ServiceRegistrationResultDto>> RegisterServicePackageAsync(int userId, CreateServiceRegistrationDto dto)
    {
        // 1. Kiểm tra hoặc tạo hồ sơ FamilyMember cho User nếu chưa có
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return ApiResponse<ServiceRegistrationResultDto>.Fail("Không tìm thấy thông tin người dùng.");
            }

            familyMember = new FamilyMember
            {
                UserId = user.UserId
            };
            await _context.FamilyMembers.AddAsync(familyMember);
            await _context.SaveChangesAsync();
        }

        // 2. Kiểm tra hồ sơ người cao tuổi
        var elderly = await _context.ElderlyMembers.FirstOrDefaultAsync(e => e.ElderlyId == dto.ElderlyId && e.IsActive);
        if (elderly == null)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Không tìm thấy hồ sơ người cao tuổi hợp lệ.");
        }

        // 3. Kiểm tra gói dịch vụ
        var package = await _context.ServicePackages.FirstOrDefaultAsync(p => p.PackageId == dto.PackageId && p.IsActive);
        if (package == null)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Gói dịch vụ không tồn tại hoặc đã tạm dừng cung cấp.");
        }

        // 4. Sinh mã đăng ký và số hóa đơn
        var random = new Random();
        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var registrationCode = $"REG-{DateTime.UtcNow:yyMMdd}-{random.Next(1000, 9999)}";
        var invoiceNo = $"HD-{datePrefix}-{random.Next(1000, 9999)}";
        var invoiceVatNo = $"VAT-{datePrefix}-{random.Next(100000, 999999)}";

        // Đảm bảo liên kết gia đình với người cao tuổi để xem được hóa đơn
        var hasRel = await _context.ElderlyFamilyRelationships
            .AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderly.ElderlyId);
        if (!hasRel)
        {
            await _context.ElderlyFamilyRelationships.AddAsync(new ElderlyFamilyRelationship
            {
                FamilyMemberId = familyMember.FamilyMemberId,
                ElderlyId = elderly.ElderlyId,
                Relationship = "Người thân",
                IsPrimaryContact = true
            });
        }

        var endDate = dto.EndDate ?? (dto.RegistrationType == "monthly" ? dto.StartDate.AddMonths(1).AddDays(-1) : dto.StartDate);

        // 5. Lưu ServiceRegistration
        var registration = new ServiceRegistration
        {
            ElderlyId = elderly.ElderlyId,
            PackageId = package.PackageId,
            StartDate = dto.StartDate,
            EndDate = endDate,
            Status = "Confirmed",
            CreatedAt = DateTime.UtcNow,
            RegistrationCode = registrationCode,
            RegistrationType = dto.RegistrationType,
            MonthlyPattern = dto.MonthlyPattern,
            RoomType = dto.RoomType,
            TotalDays = dto.TotalDays,
            SupportSurcharge = dto.SupportSurcharge,
            RoomSurcharge = dto.RoomSurcharge,
            TotalAmount = dto.TotalAmount,
            SelectedDatesJson = dto.SelectedDates != null ? JsonSerializer.Serialize(dto.SelectedDates) : null
        };

        await _context.ServiceRegistrations.AddAsync(registration);
        await _context.SaveChangesAsync();

        var method = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Chuyển khoản" : dto.PaymentMethod;
        if (method.Length > 100) method = method[..100];

        // 6. Lưu hóa đơn độc lập; payment tham chiếu hóa đơn để hỗ trợ nhiều lần thanh toán.
        var invoice = new Invoice
        {
            RegistrationId = registration.RegistrationId,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo,
            TotalAmount = dto.TotalAmount,
            Status = "Paid",
            IssuedAt = DateTime.UtcNow
        };
        await _context.Invoices.AddAsync(invoice);
        await _context.SaveChangesAsync();

        // 7. Lưu giao dịch thanh toán gắn với hóa đơn.
        var payment = new Payment
        {
            RegistrationId = registration.RegistrationId,
            InvoiceId = invoice.InvoiceId,
            Amount = dto.TotalAmount,
            PaymentMethod = method,
            PaymentStatus = "Paid",
            TransactionReference = $"TXN-{Random.Shared.Next(10000000, 99999999)}",
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo
        };

        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();
        await AuditLogWriter.WriteAsync(_context, userId, "REGISTER_AND_PAY_SERVICE", nameof(ServiceRegistration), registration.RegistrationId.ToString(), new
        {
            registration.ElderlyId,
            registration.PackageId,
            invoice.InvoiceId,
            invoice.InvoiceNo,
            payment.Amount,
            payment.PaymentMethod
        });

        var result = new ServiceRegistrationResultDto
        {
            RegistrationId = registration.RegistrationId,
            RegistrationCode = registration.RegistrationCode,
            PaymentId = payment.PaymentId,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo,
            TotalAmount = dto.TotalAmount,
            Status = registration.Status,
            CreatedAt = registration.CreatedAt
        };

        return ApiResponse<ServiceRegistrationResultDto>.Ok(result, "Đăng ký gói dịch vụ và tạo hóa đơn thành công.");
    }

    public async Task<ApiResponse<List<InvoiceDto>>> GetMyInvoicesAsync(int userId)
    {
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<List<InvoiceDto>>.Ok(new List<InvoiceDto>(), "Chưa có hóa đơn nào.");
        }

        // Lấy danh sách ID người cao tuổi mà user phụ trách
        var elderlyIds = await _context.ElderlyFamilyRelationships
            .Where(r => r.FamilyMemberId == familyMember.FamilyMemberId)
            .Select(r => r.ElderlyId)
            .ToListAsync();

        if (elderlyIds.Count == 0)
        {
            return ApiResponse<List<InvoiceDto>>.Ok(new List<InvoiceDto>(), "Chưa có hóa đơn nào.");
        }

        // Hóa đơn là bản ghi công nợ; payments là các giao dịch thanh toán của hóa đơn.
        var invoices = await _context.Invoices
            .Include(i => i.Registration)
                .ThenInclude(r => r.Package)
            .Include(i => i.Registration)
                .ThenInclude(r => r.Elderly)
                    .ThenInclude(e => e.ElderlyFamilyRelationships)
            .Include(i => i.Payments)
            .Where(i => elderlyIds.Contains(i.Registration.ElderlyId))
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync();

        var invoiceDtos = invoices.Select(i => MapToInvoiceDto(i, familyMember.FamilyMemberId)).ToList();

        return ApiResponse<List<InvoiceDto>>.Ok(invoiceDtos, "Lấy danh sách hóa đơn thành công.");
    }

    public async Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(int userId, string invoiceNo)
    {
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            return ApiResponse<InvoiceDto>.Fail("Không tìm thấy thông tin gia đình.");
        }

        var invoice = await _context.Invoices
            .Include(i => i.Registration)
                .ThenInclude(r => r.Package)
            .Include(i => i.Registration)
                .ThenInclude(r => r.Elderly)
                    .ThenInclude(e => e.ElderlyFamilyRelationships)
            .Include(i => i.Payments)
            .FirstOrDefaultAsync(i => i.InvoiceNo == invoiceNo);

        if (invoice == null)
        {
            return ApiResponse<InvoiceDto>.Fail("Không tìm thấy hóa đơn.");
        }

        // Kiểm tra quyền xem
        var hasAccess = invoice.Registration.Elderly.ElderlyFamilyRelationships
            .Any(r => r.FamilyMemberId == familyMember.FamilyMemberId);

        if (!hasAccess)
        {
            return ApiResponse<InvoiceDto>.Fail("Bạn không có quyền xem hóa đơn này.");
        }

        var dto = MapToInvoiceDto(invoice, familyMember.FamilyMemberId);
        return ApiResponse<InvoiceDto>.Ok(dto, "Lấy chi tiết hóa đơn thành công.");
    }

    private static InvoiceDto MapToInvoiceDto(Invoice invoice, int familyMemberId)
    {
        var reg = invoice.Registration;
        var elderly = reg.Elderly;
        var payment = invoice.Payments
            .OrderByDescending(p => p.PaidAt ?? p.CreatedAt)
            .FirstOrDefault();
        var rel = elderly.ElderlyFamilyRelationships
            .FirstOrDefault(r => r.FamilyMemberId == familyMemberId)?.Relationship ?? "Người thân";

        string serviceTypeLabel;
        if (reg.RegistrationType == "monthly")
        {
            var pattern = reg.MonthlyPattern == "all" ? "Cả tuần T2-T7" : reg.MonthlyPattern == "mwf" ? "T2-4-6" : "T3-5-7";
            serviceTypeLabel = $"Theo tháng ({pattern})";
        }
        else
        {
            serviceTypeLabel = $"Theo ngày ({reg.TotalDays} ngày)";
        }

        string roomTypeLabel = reg.RoomType == "small" ? "Phòng VIP (1–2 người)" : "Phòng Tiêu Chuẩn (4–6 người)";

        string datesDescription = "";
        if (reg.RegistrationType == "monthly" && reg.EndDate.HasValue)
        {
            datesDescription = $"{reg.StartDate:dd/MM/yyyy} – {reg.EndDate.Value:dd/MM/yyyy}";
        }
        else
        {
            datesDescription = $"{reg.TotalDays} ngày đã chọn";
        }

        return new InvoiceDto
        {
            Id = invoice.InvoiceNo,
            RegistrationCode = reg.RegistrationCode ?? $"REG-{reg.CreatedAt:yyMMdd}",
            CreatedAt = invoice.IssuedAt.ToString("dd/MM/yyyy HH:mm"),
            ElderlyName = elderly.FullName,
            Relationship = rel,
            PackageName = reg.Package?.PackageName ?? "Gói chăm sóc ban ngày",
            ServiceTypeLabel = serviceTypeLabel,
            RoomTypeLabel = roomTypeLabel,
            TotalDays = reg.TotalDays,
            DatesDescription = datesDescription,
            PackagePrice = reg.PriceAtPurchase,
            SupportSurcharge = reg.SupportSurcharge,
            RoomSurcharge = reg.RoomSurcharge,
            TotalAmount = invoice.TotalAmount,
            Status = invoice.Status.Equals("Paid", StringComparison.OrdinalIgnoreCase)
                ? "paid"
                : invoice.Status.Equals("Refunded", StringComparison.OrdinalIgnoreCase) ? "refunded" : "pending",
            PaymentMethod = payment?.PaymentMethod ?? "Chưa thanh toán",
            InvoiceVatNo = invoice.InvoiceVatNo
        };
    }
}
