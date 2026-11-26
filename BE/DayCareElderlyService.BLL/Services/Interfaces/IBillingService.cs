using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Billing;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IBillingService
{
    Task<ApiResponse<List<ServicePackageDto>>> GetActivePackagesAsync();
    Task<ApiResponse<ServiceRegistrationResultDto>> RegisterServicePackageAsync(int userId, CreateServiceRegistrationDto dto);
    Task<ApiResponse<PayOSRegistrationResultDto>> CreatePayOSRegistrationAsync(int userId, CreatePayOSRegistrationDto dto);
    Task<ApiResponse<PayOSStatusResultDto>> GetPayOSStatusAsync(int userId, long orderCode);
    Task<ApiResponse<bool>> CancelPayOSPaymentAsync(int userId, long orderCode);
    Task<bool> HandlePayOSWebhookAsync(long orderCode, bool isPaid);
    Task<ApiResponse<List<InvoiceDto>>> GetMyInvoicesAsync(int userId);
    Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(int userId, string invoiceNo);
}
