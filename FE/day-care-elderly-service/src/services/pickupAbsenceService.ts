import api from "./api";
import type { ApiResponse } from "../types/common";
import type { PickupPerson } from "./attendanceService";

export interface SavePickupPersonDto {
  fullName: string;
  relationship?: string | null;
  phoneNumber: string;
  idCardLast4: string;
}

export interface AbsenceReport {
  absenceId: number;
  elderlyId: number;
  elderlyName: string;
  absenceDate: string;
  reason: string | null;
  createdAt: string;
}

/** BR-30 người được đón, SR-32 báo vắng — phía gia đình */
export const pickupAbsenceService = {
  async listPickup(elderlyId: number): Promise<ApiResponse<PickupPerson[]>> {
    return (await api.get(`/api/family/elderly/${elderlyId}/pickup-persons`)).data;
  },
  async addPickup(elderlyId: number, dto: SavePickupPersonDto): Promise<ApiResponse<PickupPerson>> {
    return (await api.post(`/api/family/elderly/${elderlyId}/pickup-persons`, dto)).data;
  },
  async updatePickup(pickupPersonId: number, dto: SavePickupPersonDto): Promise<ApiResponse<PickupPerson>> {
    return (await api.put(`/api/family/pickup-persons/${pickupPersonId}`, dto)).data;
  },
  async removePickup(pickupPersonId: number): Promise<ApiResponse<boolean>> {
    return (await api.delete(`/api/family/pickup-persons/${pickupPersonId}`)).data;
  },
  async listAbsences(): Promise<ApiResponse<AbsenceReport[]>> {
    return (await api.get("/api/family/absences")).data;
  },
  async reportAbsence(elderlyId: number, absenceDate: string, reason?: string): Promise<ApiResponse<AbsenceReport>> {
    return (await api.post("/api/family/absences", { elderlyId, absenceDate, reason })).data;
  },
  async cancelAbsence(absenceId: number): Promise<ApiResponse<boolean>> {
    return (await api.delete(`/api/family/absences/${absenceId}`)).data;
  },
};

export default pickupAbsenceService;
