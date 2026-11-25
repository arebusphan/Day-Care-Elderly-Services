import api from "./api";
import { cleanParams } from "../types/common";
import type { ApiResponse, PagedResult } from "../types/common";
import type {
  SupplyConsumptionSummary,
  TopUsedSupply,
  ExpiringSupplyAlert,
  ElderlySupplyChargeReport,
} from "../types/supplyAnalytics";

export type {
  SupplyConsumptionSummary,
  TopUsedSupply,
  ExpiringSupplyAlert,
  ElderlySupplyChargeReport,
} from "../types/supplyAnalytics";

export interface MedicalSupply {
  supplyId: number;
  centerId: number;
  centerName: string;
  supplyName: string;
  unit: string;
  minimumStock: number;
  quantityInStock: number;
  isActive: boolean;
  createdAt: string;
  unitPrice: number;
  expiryDate: string | null;
}

export interface MedicalSupplyFilter {
  pageNumber?: number;
  pageSize?: number;
  isActive?: boolean;
  isLowStock?: boolean;
  search?: string;
}

export interface CreateMedicalSupplyDto {
  supplyName: string;
  unit: string;
  minimumStock: number;
  quantityInStock: number;
  unitPrice: number;
  expiryDate?: string | null;
}

export interface UpdateMedicalSupplyDto {
  supplyName: string;
  unit: string;
  minimumStock: number;
  unitPrice: number;
  expiryDate?: string | null;
}

/** BE coi là sắp hết khi tồn kho <= mức tối thiểu */
export const isLowStock = (s: Pick<MedicalSupply, "quantityInStock" | "minimumStock">) =>
  s.quantityInStock <= s.minimumStock;

const BASE = "/api/medical-supplies";

export const medicalSupplyService = {
  async list(filter: MedicalSupplyFilter): Promise<ApiResponse<PagedResult<MedicalSupply>>> {
    const res = await api.get(BASE, { params: cleanParams(filter) });
    return res.data;
  },

  async get(id: number): Promise<ApiResponse<MedicalSupply>> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  async create(dto: CreateMedicalSupplyDto): Promise<ApiResponse<MedicalSupply>> {
    const res = await api.post(BASE, dto);
    return res.data;
  },

  async update(id: number, dto: UpdateMedicalSupplyDto): Promise<ApiResponse<MedicalSupply>> {
    const res = await api.put(`${BASE}/${id}`, dto);
    return res.data;
  },

  /** adjustmentQuantity > 0 nhập kho, < 0 xuất kho */
  async adjustStock(id: number, adjustmentQuantity: number, notes?: string): Promise<ApiResponse<MedicalSupply>> {
    const res = await api.patch(`${BASE}/${id}/stock`, { adjustmentQuantity, notes });
    return res.data;
  },

  async toggleStatus(id: number): Promise<ApiResponse<MedicalSupply>> {
    const res = await api.patch(`${BASE}/${id}/toggle-status`);
    return res.data;
  },

  /**
   * WF-05 / D2: Thống kê tổng quan tồn kho, giá trị tài sản vật tư và chi phí sự cố.
   */
  async getAnalyticsSummary(): Promise<ApiResponse<SupplyConsumptionSummary>> {
    const res = await api.get(`${BASE}/analytics/summary`);
    return res.data;
  },

  /**
   * Thống kê top vật tư y tế tiêu hao nhiều nhất theo số lượng và chi phí.
   */
  async getTopConsumed(limit = 10, months: number | null = 1): Promise<ApiResponse<TopUsedSupply[]>> {
    const res = await api.get(`${BASE}/analytics/top-consumed`, {
      params: cleanParams({ limit, months }),
    });
    return res.data;
  },

  /**
   * SR-04: Quét và cảnh báo danh sách vật tư y tế sắp hết hạn hoặc đã quá hạn sử dụng.
   */
  async getExpiringSupplies(thresholdDays = 30): Promise<ApiResponse<ExpiringSupplyAlert[]>> {
    const res = await api.get(`${BASE}/analytics/expiring`, {
      params: cleanParams({ thresholdDays }),
    });
    return res.data;
  },

  /**
   * Báo cáo tổng hợp chi phí vật tư sơ cấp cứu phát sinh theo từng người cao tuổi.
   */
  async getElderlyCharges(months: number | null = 1): Promise<ApiResponse<ElderlySupplyChargeReport[]>> {
    const res = await api.get(`${BASE}/analytics/elderly-charges`, {
      params: cleanParams({ months }),
    });
    return res.data;
  },
};

export default medicalSupplyService;
