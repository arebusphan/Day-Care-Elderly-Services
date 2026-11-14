import api from "./api";
import { cleanParams } from "../types/common";
import type { ApiResponse, PagedResult } from "../types/common";

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
}

export interface UpdateMedicalSupplyDto {
  supplyName: string;
  unit: string;
  minimumStock: number;
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
};

export default medicalSupplyService;
