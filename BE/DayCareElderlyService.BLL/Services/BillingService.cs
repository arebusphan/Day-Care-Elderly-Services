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
    private readonly IPayOSService _payOSService;

    public BillingService(AppDbContext context, IPayOSService payOSService)
    {
        _context = context;
        _payOSService = payOSService;
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

        // 3a. BR-83: chỉ đăng ký cho người cao tuổi đã liên kết với tài khoản gia đình.
        // Trước đây hàm này tự tạo liên kết → gia đình bất kỳ có thể "nhận" cụ của nhà khác và xem care log.
        var isLinked = await _context.ElderlyFamilyRelationships
            .AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderly.ElderlyId);
        if (!isLinked)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Bạn chỉ có thể đăng ký gói cho người thân thuộc tài khoản của mình.");
        }

        // 3b. Kiểm tra hình thức đăng ký và lịch ngày
        var registrationType = dto.RegistrationType?.Trim().ToLowerInvariant();
        if (registrationType is not ("daily" or "monthly"))
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Hình thức đăng ký không hợp lệ (daily hoặc monthly).");
        }
        if (registrationType == "monthly" && !PackagePricing.MonthlyPatterns.Contains(dto.MonthlyPattern?.Trim().ToLowerInvariant()))
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Lịch theo tháng không hợp lệ (all, mwf hoặc tts).");
        }
        if (dto.StartDate < VietnamTime.Today)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail("Ngày bắt đầu không được ở quá khứ.");
        }

        var numDays = dto.TotalDays;
        if (registrationType == "daily")
        {
            var dates = new List<DateOnly>();
            foreach (var raw in dto.SelectedDates ?? new List<string>())
            {
                if (!DateOnly.TryParse(raw, out var date))
                {
                    return ApiResponse<ServiceRegistrationResultDto>.Fail($"Ngày \"{raw}\" không hợp lệ.");
                }
                dates.Add(date);
            }
            dates = dates.Distinct().ToList();
            if (dates.Count == 0)
            {
                return ApiResponse<ServiceRegistrationResultDto>.Fail("Vui lòng chọn ít nhất một ngày.");
            }
            if (dates.Any(d => d < VietnamTime.Today))
            {
                return ApiResponse<ServiceRegistrationResultDto>.Fail("Không thể đăng ký ngày đã qua.");
            }
            if (dates.Any(d => d.DayOfWeek == DayOfWeek.Sunday))
            {
                return ApiResponse<ServiceRegistrationResultDto>.Fail("Trung tâm nghỉ Chủ nhật, vui lòng bỏ chọn ngày Chủ nhật.");
            }
            numDays = dates.Count; // số ngày tính tiền lấy từ danh sách ngày, không tin TotalDays từ client
        }

        // 3c. Gói đã đủ chỗ thì không nhận đăng ký mới (tiêu chí F-03)
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeBookings = await _context.ServiceRegistrations
            .CountAsync(r => r.PackageId == package.PackageId && r.Status == "Confirmed" && (r.EndDate == null || r.EndDate >= today));
        if (activeBookings >= package.TotalSlots)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail($"Gói \"{package.PackageName}\" đã hết chỗ ({package.TotalSlots}/{package.TotalSlots}).");
        }

        // 3d. BR-83 / SR-42: server tự tính tiền; client phải xác nhận đúng giá này (BR-17)
        var quote = PackagePricing.Calculate(package, elderly, registrationType, dto.MonthlyPattern, numDays, dto.RoomType);
        if (dto.TotalAmount != quote.Total)
        {
            return ApiResponse<ServiceRegistrationResultDto>.Fail(
                $"Tổng tiền không khớp với giá hiện hành ({quote.Total:N0} đ). Vui lòng tải lại trang và xác nhận lại giá.");
        }

        // 4. Sinh mã đăng ký và số hóa đơn
        var random = new Random();
        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var registrationCode = $"REG-{DateTime.UtcNow:yyMMdd}-{random.Next(1000, 9999)}";
        var invoiceNo = $"HD-{datePrefix}-{random.Next(1000, 9999)}";
        var invoiceVatNo = $"VAT-{datePrefix}-{random.Next(100000, 999999)}";

        var endDate = dto.EndDate ?? (registrationType == "monthly" ? dto.StartDate.AddMonths(1).AddDays(-1) : dto.StartDate);

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
            RegistrationType = registrationType,
            MonthlyPattern = dto.MonthlyPattern,
            RoomType = dto.RoomType,
            TotalDays = numDays,
            SupportSurcharge = quote.SupportSurcharge,
            RoomSurcharge = quote.RoomSurcharge,
            TotalAmount = quote.Total,
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
            TotalAmount = quote.Total,
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
            Amount = quote.Total,
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
            TotalAmount = quote.Total,
            Status = registration.Status,
            CreatedAt = registration.CreatedAt
        };

        return ApiResponse<ServiceRegistrationResultDto>.Ok(result, "Đăng ký gói dịch vụ và tạo hóa đơn thành công.");
    }

    public async Task<ApiResponse<PayOSRegistrationResultDto>> CreatePayOSRegistrationAsync(int userId, CreatePayOSRegistrationDto dto)
    {
        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
                return ApiResponse<PayOSRegistrationResultDto>.Fail("Không tìm thấy thông tin người dùng.");

            familyMember = new FamilyMember { UserId = user.UserId };
            await _context.FamilyMembers.AddAsync(familyMember);
            await _context.SaveChangesAsync();
        }

        var elderly = await _context.ElderlyMembers.FirstOrDefaultAsync(e => e.ElderlyId == dto.ElderlyId && e.IsActive);
        if (elderly == null)
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Không tìm thấy hồ sơ người cao tuổi hợp lệ.");

        var package = await _context.ServicePackages.FirstOrDefaultAsync(p => p.PackageId == dto.PackageId && p.IsActive);
        if (package == null)
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Gói dịch vụ không tồn tại hoặc đã tạm dừng cung cấp.");

        var isLinked = await _context.ElderlyFamilyRelationships
            .AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == elderly.ElderlyId);
        if (!isLinked)
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Bạn chỉ có thể đăng ký gói cho người thân thuộc tài khoản của mình.");

        var registrationType = dto.RegistrationType?.Trim().ToLowerInvariant();
        if (registrationType is not ("daily" or "monthly"))
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Hình thức đăng ký không hợp lệ (daily hoặc monthly).");

        if (registrationType == "monthly" && !PackagePricing.MonthlyPatterns.Contains(dto.MonthlyPattern?.Trim().ToLowerInvariant()))
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Lịch theo tháng không hợp lệ (all, mwf hoặc tts).");

        if (dto.StartDate < VietnamTime.Today)
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Ngày bắt đầu không được ở quá khứ.");

        var numDays = dto.TotalDays;
        if (registrationType == "daily")
        {
            var dates = new List<DateOnly>();
            foreach (var raw in dto.SelectedDates ?? new List<string>())
            {
                if (!DateOnly.TryParse(raw, out var date))
                    return ApiResponse<PayOSRegistrationResultDto>.Fail($"Ngày \"{raw}\" không hợp lệ.");
                dates.Add(date);
            }
            dates = dates.Distinct().ToList();
            if (dates.Count == 0)
                return ApiResponse<PayOSRegistrationResultDto>.Fail("Vui lòng chọn ít nhất một ngày.");
            if (dates.Any(d => d < VietnamTime.Today))
                return ApiResponse<PayOSRegistrationResultDto>.Fail("Không thể đăng ký ngày đã qua.");
            if (dates.Any(d => d.DayOfWeek == DayOfWeek.Sunday))
                return ApiResponse<PayOSRegistrationResultDto>.Fail("Trung tâm nghỉ Chủ nhật, vui lòng bỏ chọn ngày Chủ nhật.");
            numDays = dates.Count;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activeBookings = await _context.ServiceRegistrations
            .CountAsync(r => r.PackageId == package.PackageId && r.Status == "Confirmed" && (r.EndDate == null || r.EndDate >= today));
        if (activeBookings >= package.TotalSlots)
            return ApiResponse<PayOSRegistrationResultDto>.Fail($"Gói \"{package.PackageName}\" đã hết chỗ ({package.TotalSlots}/{package.TotalSlots}).");

        var quote = PackagePricing.Calculate(package, elderly, registrationType, dto.MonthlyPattern, numDays, dto.RoomType);
        if (dto.TotalAmount != quote.Total)
        {
            return ApiResponse<PayOSRegistrationResultDto>.Fail(
                $"Tổng tiền không khớp với giá hiện hành ({quote.Total:N0} đ). Vui lòng tải lại trang và xác nhận lại giá.");
        }

        var amountLong = (long)Math.Round(quote.Total, MidpointRounding.AwayFromZero);
        if (amountLong <= 0)
            return ApiResponse<PayOSRegistrationResultDto>.Fail("Số tiền thanh toán phải lớn hơn 0.");

        var datePrefix = DateTime.UtcNow.ToString("yyyyMMdd");
        var registrationCode = $"REG-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}";
        var invoiceNo = $"HD-{datePrefix}-{Random.Shared.Next(1000, 9999)}";
        var invoiceVatNo = $"VAT-{datePrefix}-{Random.Shared.Next(100000, 999999)}";
        var orderCode = long.Parse($"{DateTime.UtcNow:yyMMddHHmmss}{Random.Shared.Next(100, 999)}");
        var endDate = dto.EndDate ?? (registrationType == "monthly" ? dto.StartDate.AddMonths(1).AddDays(-1) : dto.StartDate);

        var returnUrl = string.IsNullOrWhiteSpace(dto.ReturnUrl)
            ? "http://localhost:5173/dashboard/family"
            : dto.ReturnUrl.Trim();
        var cancelUrl = string.IsNullOrWhiteSpace(dto.CancelUrl)
            ? returnUrl
            : dto.CancelUrl.Trim();

        // Mô tả tối đa 25 ký tự để tương thích mọi ngân hàng VietQR
        var description = $"DK {registrationCode}";
        if (description.Length > 25) description = description[..25];

        var expiredAt = DateTimeOffset.UtcNow.AddMinutes(15).ToUnixTimeSeconds();
        var items = new List<PayOSItemDto>
        {
            new()
            {
                Name = $"{package.PackageName} - {elderly.FullName}",
                Quantity = 1,
                Price = amountLong
            }
        };

        PayOSCreateLinkResponseData payosLink;
        try
        {
            payosLink = await _payOSService.CreatePaymentLinkAsync(
                orderCode, amountLong, description, returnUrl, cancelUrl, items, expiredAt);
        }
        catch (Exception ex)
        {
            return ApiResponse<PayOSRegistrationResultDto>.Fail($"Không thể tạo liên kết thanh toán PayOS: {ex.Message}");
        }

        var registration = new ServiceRegistration
        {
            ElderlyId = elderly.ElderlyId,
            PackageId = package.PackageId,
            StartDate = dto.StartDate,
            EndDate = endDate,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
            RegistrationCode = registrationCode,
            RegistrationType = registrationType,
            MonthlyPattern = dto.MonthlyPattern,
            RoomType = dto.RoomType,
            TotalDays = numDays,
            SupportSurcharge = quote.SupportSurcharge,
            RoomSurcharge = quote.RoomSurcharge,
            TotalAmount = quote.Total,
            SelectedDatesJson = dto.SelectedDates != null ? JsonSerializer.Serialize(dto.SelectedDates) : null
        };
        await _context.ServiceRegistrations.AddAsync(registration);
        await _context.SaveChangesAsync();

        var invoice = new Invoice
        {
            RegistrationId = registration.RegistrationId,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo,
            TotalAmount = quote.Total,
            Status = "Pending",
            IssuedAt = DateTime.UtcNow
        };
        await _context.Invoices.AddAsync(invoice);
        await _context.SaveChangesAsync();

        var payment = new Payment
        {
            RegistrationId = registration.RegistrationId,
            InvoiceId = invoice.InvoiceId,
            Amount = quote.Total,
            PaymentMethod = "Chuyển khoản QR (PayOS)",
            PaymentStatus = "Pending",
            TransactionReference = orderCode.ToString(),
            PaidAt = null,
            CreatedAt = DateTime.UtcNow,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo
        };
        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();

        return ApiResponse<PayOSRegistrationResultDto>.Ok(new PayOSRegistrationResultDto
        {
            RegistrationId = registration.RegistrationId,
            RegistrationCode = registrationCode,
            PaymentId = payment.PaymentId,
            InvoiceNo = invoiceNo,
            InvoiceVatNo = invoiceVatNo,
            OrderCode = orderCode,
            Amount = amountLong,
            Description = payosLink.Description,
            CheckoutUrl = payosLink.CheckoutUrl,
            QrCode = payosLink.QrCode,
            PaymentLinkId = payosLink.PaymentLinkId,
            Bin = payosLink.Bin,
            AccountNumber = payosLink.AccountNumber,
            AccountName = payosLink.AccountName,
            Status = payosLink.Status,
            CreatedAt = registration.CreatedAt
        }, "Đã tạo mã thanh toán PayOS.");
    }

    public async Task<ApiResponse<PayOSStatusResultDto>> GetPayOSStatusAsync(int userId, long orderCode)
    {
        var orderRef = orderCode.ToString();
        var payment = await _context.Payments
            .Include(p => p.Registration)
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.TransactionReference == orderRef);

        if (payment == null)
            return ApiResponse<PayOSStatusResultDto>.Fail("Không tìm thấy giao dịch PayOS.");

        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
            return ApiResponse<PayOSStatusResultDto>.Fail("Không có quyền truy cập giao dịch này.");

        var isLinked = await _context.ElderlyFamilyRelationships
            .AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == payment.Registration.ElderlyId);
        if (!isLinked)
            return ApiResponse<PayOSStatusResultDto>.Fail("Không có quyền truy cập giao dịch này.");

        if (payment.PaymentStatus == "Paid")
        {
            return ApiResponse<PayOSStatusResultDto>.Ok(new PayOSStatusResultDto
            {
                OrderCode = orderCode,
                Status = "PAID",
                RegistrationCode = payment.Registration.RegistrationCode,
                InvoiceNo = payment.InvoiceNo ?? string.Empty,
                TotalAmount = payment.Amount,
                PaidAt = payment.PaidAt
            });
        }

        if (payment.PaymentStatus is "Cancelled" or "Expired")
        {
            return ApiResponse<PayOSStatusResultDto>.Ok(new PayOSStatusResultDto
            {
                OrderCode = orderCode,
                Status = payment.PaymentStatus.ToUpperInvariant(),
                RegistrationCode = payment.Registration.RegistrationCode,
                InvoiceNo = payment.InvoiceNo ?? string.Empty,
                TotalAmount = payment.Amount
            });
        }

        var info = await _payOSService.GetPaymentInfoAsync(orderCode);
        var status = info.Status?.ToUpperInvariant() ?? "PENDING";

        if (status == "PAID")
        {
            await MarkPayOSOrderPaidAsync(payment, userId);
        }
        else if (status is "CANCELLED" or "EXPIRED")
        {
            payment.PaymentStatus = status == "EXPIRED" ? "Expired" : "Cancelled";
            if (payment.Invoice != null) payment.Invoice.Status = "Cancelled";
            payment.Registration.Status = "Cancelled";
            await _context.SaveChangesAsync();
        }

        return ApiResponse<PayOSStatusResultDto>.Ok(new PayOSStatusResultDto
        {
            OrderCode = orderCode,
            Status = status,
            RegistrationCode = payment.Registration.RegistrationCode,
            InvoiceNo = payment.InvoiceNo ?? string.Empty,
            TotalAmount = payment.Amount,
            PaidAt = payment.PaidAt
        });
    }

    public async Task<ApiResponse<bool>> CancelPayOSPaymentAsync(int userId, long orderCode)
    {
        var orderRef = orderCode.ToString();
        var payment = await _context.Payments
            .Include(p => p.Registration)
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.TransactionReference == orderRef);

        if (payment == null)
            return ApiResponse<bool>.Fail("Không tìm thấy giao dịch PayOS.");

        var familyMember = await _context.FamilyMembers.FirstOrDefaultAsync(f => f.UserId == userId);
        if (familyMember == null)
            return ApiResponse<bool>.Fail("Không có quyền hủy giao dịch này.");

        var isLinked = await _context.ElderlyFamilyRelationships
            .AnyAsync(r => r.FamilyMemberId == familyMember.FamilyMemberId && r.ElderlyId == payment.Registration.ElderlyId);
        if (!isLinked)
            return ApiResponse<bool>.Fail("Không có quyền hủy giao dịch này.");

        if (payment.PaymentStatus == "Paid")
            return ApiResponse<bool>.Fail("Giao dịch đã được thanh toán, không thể hủy.");

        try
        {
            await _payOSService.CancelPaymentLinkAsync(orderCode, "Người dùng hủy thanh toán");
        }
        catch
        {
            // Bỏ qua lỗi từ PayOS nếu link đã hết hạn/hủy sẵn
        }

        payment.PaymentStatus = "Cancelled";
        if (payment.Invoice != null) payment.Invoice.Status = "Cancelled";
        payment.Registration.Status = "Cancelled";
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Đã hủy giao dịch PayOS.");
    }

    public async Task<bool> HandlePayOSWebhookAsync(long orderCode, bool isPaid)
    {
        var orderRef = orderCode.ToString();
        var payment = await _context.Payments
            .Include(p => p.Registration)
            .Include(p => p.Invoice)
            .FirstOrDefaultAsync(p => p.TransactionReference == orderRef);

        if (payment == null) return false;

        if (isPaid && payment.PaymentStatus != "Paid")
        {
            await MarkPayOSOrderPaidAsync(payment, null);
        }
        else if (!isPaid && payment.PaymentStatus == "Pending")
        {
            payment.PaymentStatus = "Cancelled";
            if (payment.Invoice != null) payment.Invoice.Status = "Cancelled";
            payment.Registration.Status = "Cancelled";
            await _context.SaveChangesAsync();
        }

        return true;
    }

    private async Task MarkPayOSOrderPaidAsync(Payment payment, int? actorUserId)
    {
        payment.PaymentStatus = "Paid";
        payment.PaidAt = DateTime.UtcNow;
        if (payment.Invoice != null) payment.Invoice.Status = "Paid";
        payment.Registration.Status = "Confirmed";
        await _context.SaveChangesAsync();

        await AuditLogWriter.WriteAsync(
            _context,
            actorUserId ?? 0,
            "PAYOS_PAYMENT_CONFIRMED",
            nameof(ServiceRegistration),
            payment.RegistrationId.ToString(),
            new
            {
                payment.Registration.ElderlyId,
                payment.Registration.PackageId,
                payment.InvoiceNo,
                payment.Amount,
                OrderCode = payment.TransactionReference
            });
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
