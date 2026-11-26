import api from "./api";
import type { InvoiceRecord } from "../types/billing";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface ServicePackageApiDto {
  packageId: string;
  packageName: string;
  description?: string;
  price: number;
  billingPeriod: string;
  pricePerDay: number;
  priceMonth3Days: number;
  priceMonthFullWeek: number;
  highlights: string[];
  includedServices: string[];
  targetAudience?: string;
  pricingNote?: string;
  totalSlots: number;
  availableSlots: number;
  endOfLifeRoomIncluded: boolean;
  isActive: boolean;
}

export interface CreateRegistrationRequest {
  packageId: string;
  elderlyId: number;
  registrationType: string;
  monthlyPattern?: string;
  startDate: string; // ISO date (yyyy-MM-dd)
  endDate?: string;
  roomType: string;
  totalDays: number;
  packagePrice: number;
  supportSurcharge: number;
  roomSurcharge: number;
  totalAmount: number;
  selectedDates?: string[];
  paymentMethod: string;
}

export interface RegistrationResultDto {
  registrationId: string;
  registrationCode: string;
  paymentId: string;
  invoiceNo: string;
  invoiceVatNo: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface CreatePayOSRegistrationRequest extends CreateRegistrationRequest {
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOSRegistrationResultDto {
  registrationId: number;
  registrationCode: string;
  paymentId: number;
  invoiceNo: string;
  invoiceVatNo: string;
  orderCode: number;
  amount: number;
  description: string;
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  bin: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: string;
}

export interface PayOSStatusResultDto {
  orderCode: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | string;
  registrationCode: string;
  invoiceNo: string;
  totalAmount: number;
  paidAt?: string;
}

export const billingApiService = {
  /** Lấy danh sách gói dịch vụ từ BE */
  getActivePackages: async (): Promise<ApiResponse<ServicePackageApiDto[]>> => {
    const response = await api.get<ApiResponse<ServicePackageApiDto[]>>("/api/family/packages");
    return response.data;
  },

  /** Đăng ký gói dịch vụ */
  registerPackage: async (data: CreateRegistrationRequest): Promise<ApiResponse<RegistrationResultDto>> => {
    const response = await api.post<ApiResponse<RegistrationResultDto>>("/api/family/packages/register", data);
    return response.data;
  },

  /** Tạo liên kết thanh toán PayOS */
  createPayOSPayment: async (
    data: CreatePayOSRegistrationRequest
  ): Promise<ApiResponse<PayOSRegistrationResultDto>> => {
    const response = await api.post<ApiResponse<PayOSRegistrationResultDto>>(
      "/api/family/packages/payos/create",
      data
    );
    return response.data;
  },

  /** Kiểm tra trạng thái thanh toán PayOS */
  getPayOSStatus: async (orderCode: number): Promise<ApiResponse<PayOSStatusResultDto>> => {
    const response = await api.get<ApiResponse<PayOSStatusResultDto>>(
      `/api/family/packages/payos/status/${orderCode}`
    );
    return response.data;
  },

  /** Hủy giao dịch thanh toán PayOS */
  cancelPayOSPayment: async (orderCode: number): Promise<ApiResponse<boolean>> => {
    const response = await api.post<ApiResponse<boolean>>(
      `/api/family/packages/payos/cancel/${orderCode}`
    );
    return response.data;
  },

  /** Lấy danh sách hóa đơn từ BE */
  getInvoices: async (): Promise<ApiResponse<InvoiceRecord[]>> => {
    const response = await api.get<ApiResponse<InvoiceRecord[]>>("/api/family/billing/invoices");
    return response.data;
  },

  /** Lấy chi tiết một hóa đơn */
  getInvoiceDetail: async (invoiceNo: string): Promise<ApiResponse<InvoiceRecord>> => {
    const response = await api.get<ApiResponse<InvoiceRecord>>(`/api/family/billing/invoices/${encodeURIComponent(invoiceNo)}`);
    return response.data;
  },
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  })
    .format(amount)
    .replace("₫", "đ");
};

export default billingApiService;
