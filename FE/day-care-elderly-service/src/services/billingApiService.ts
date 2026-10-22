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
  elderlyId: string;
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
