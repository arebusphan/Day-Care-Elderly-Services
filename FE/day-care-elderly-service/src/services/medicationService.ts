import api from "./api";
import type { ApiResponse } from "../types/auth";

export interface MedicationPlan {
  medicationPlanId: number;
  elderlyId: number;
  elderlyName: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduleTimes: string[]; // ["08:00", "20:00"]
  startDate: string; // yyyy-MM-dd
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  pendingDoseCount: number;
}

export interface CreateMedicationPlanDto {
  medicationName: string;
  dosage: string;
  instructions?: string;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  /** Số ngày sinh lịch liều ban đầu (BE mặc định 14, tối đa 60) */
  generateDays?: number;
}

export interface UpdateMedicationPlanDto {
  medicationName: string;
  dosage: string;
  instructions?: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  /** Gửi khi đổi giờ uống → BE sinh lại liều tương lai */
  scheduleTimes?: string[];
}

export interface GenerateDosesDto {
  scheduleTimes: string[];
  from?: string;
  to?: string;
}

export interface GenerateDosesResult {
  medicationPlanId: number;
  from: string;
  to: string;
  scheduleTimes: string[];
  createdCount: number;
  skippedExistingCount: number;
}

/** Một dòng MedicationRecords (lịch sử cho uống). */
export interface DoseHistoryItem {
  medicationRecordId: number;
  medicationPlanId: number;
  elderlyId: number;
  elderlyName: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduledAt: string;
  status: string;
  statusLabel: string;
  recordedAt: string | null;
  notes: string | null;
  staffName: string;
}

export interface DoseHistoryFilter {
  elderlyId?: number;
  from?: string;
  to?: string;
  status?: string;
  take?: number;
}

const BASE = "/api/staff";

export const medicationService = {
  async getPlans(elderlyId: number, activeOnly?: boolean): Promise<ApiResponse<MedicationPlan[]>> {
    const res = await api.get(`${BASE}/elderly/${elderlyId}/medication-plans`, {
      params: activeOnly === undefined ? {} : { activeOnly },
    });
    return res.data;
  },

  async createPlan(elderlyId: number, dto: CreateMedicationPlanDto): Promise<ApiResponse<MedicationPlan>> {
    const res = await api.post(`${BASE}/elderly/${elderlyId}/medication-plans`, dto);
    return res.data;
  },

  async updatePlan(planId: number, dto: UpdateMedicationPlanDto): Promise<ApiResponse<MedicationPlan>> {
    const res = await api.put(`${BASE}/medication-plans/${planId}`, dto);
    return res.data;
  },

  async generateDoses(planId: number, dto: GenerateDosesDto): Promise<ApiResponse<GenerateDosesResult>> {
    const res = await api.post(`${BASE}/medication-plans/${planId}/doses/generate`, dto);
    return res.data;
  },

  async getDoseHistory(filter: DoseHistoryFilter = {}): Promise<ApiResponse<DoseHistoryItem[]>> {
    const res = await api.get(`${BASE}/doses/history`, { params: filter });
    return res.data;
  },
};

export default medicationService;
