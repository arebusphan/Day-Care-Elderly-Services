import api from "./api";
import type { ApiResponse } from "../types/common";

/** F-04: hồ sơ nghề nghiệp nhân viên */
export interface StaffProfile {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  position: string | null;
  qualification: string | null;
  startDate: string | null;
}

export interface UpdateStaffProfileDto {
  fullName: string;
  phoneNumber?: string | null;
  position?: string | null;
  qualification?: string | null;
  startDate?: string | null;
}

/** SRS 3.4.3: hồ sơ người cao tuổi phía Manager */
export interface ElderlyDetail {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  medicalNotes: string | null;
  mobilityStatus: "Normal" | "Support";
  /** Mã bệnh nền: DIABETES, HYPERTENSION, HEART — lọc lịch hoạt động trong gói */
  chronicConditions: string[];
  careNotes: string | null;
  emergencyNotes: string | null;
  isActive: boolean;
  familyContacts: string[];
  activePackages: string[];
  assignedStaffToday: string[];
}

export type UpdateElderlyDto = Omit<ElderlyDetail, "elderlyId" | "isActive" | "familyContacts" | "activePackages" | "assignedStaffToday" | "chronicConditions">
  & { chronicConditions?: string[] };

export interface InactiveElderly {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  updatedAt: string | null;
}

export const centerProfileService = {
  async getStaffProfile(userId: number): Promise<ApiResponse<StaffProfile>> {
    return (await api.get(`/api/center/staff/${userId}/profile`)).data;
  },
  async updateStaffProfile(userId: number, dto: UpdateStaffProfileDto): Promise<ApiResponse<StaffProfile>> {
    return (await api.put(`/api/center/staff/${userId}/profile`, dto)).data;
  },
  async getElderly(elderlyId: number): Promise<ApiResponse<ElderlyDetail>> {
    return (await api.get(`/api/center/elderly/${elderlyId}`)).data;
  },
  async updateElderly(elderlyId: number, dto: UpdateElderlyDto): Promise<ApiResponse<ElderlyDetail>> {
    return (await api.put(`/api/center/elderly/${elderlyId}`, dto)).data;
  },
  async setElderlyActive(elderlyId: number, value: boolean): Promise<ApiResponse<boolean>> {
    return (await api.patch(`/api/center/elderly/${elderlyId}/active`, null, { params: { value } })).data;
  },
  async getInactiveElderly(): Promise<ApiResponse<InactiveElderly[]>> {
    return (await api.get("/api/center/elderly/inactive")).data;
  },
};

export default centerProfileService;
