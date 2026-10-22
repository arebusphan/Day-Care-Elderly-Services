using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.BLL.DTOs.Billing;

namespace DayCareElderlyService.BLL.Services.Interfaces;

public interface IBillingService
{
    Task<ApiResponse<List<ServicePackageDto>>> GetActivePackagesAsync();
    Task<ApiResponse<ServiceRegistrationResultDto>> RegisterServicePackageAsync(Guid userId, CreateServiceRegistrationDto dto);
    Task<ApiResponse<List<InvoiceDto>>> GetMyInvoicesAsync(Guid userId);
    Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(Guid userId, string invoiceNo);
}
