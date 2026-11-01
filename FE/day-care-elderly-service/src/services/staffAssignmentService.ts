import api from "./api";
import type { ApiResponse } from "./centerStaffService";

export interface ElderlyInGroup {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  mobilityStatus: string; // "Normal" | "Support"
  careNotes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  assignmentId: number | null;
  assignmentNotes: string | null;
}

export interface StaffCareGroup {
  groupId?: number;
  groupName?: string;
  groupType?: "Normal" | "Support";
  maxCapacity?: number;
  elderlyCount?: number;
  staffId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  normalElderlyCount: number;
  needSupportElderlyCount: number;
  totalElderlyCount: number;
  isNormalExceeded?: boolean;
  isNeedSupportExceeded?: boolean;
  isExceeded?: boolean;
  elderlyList: ElderlyInGroup[];
}

export interface DailySchedulePlan {
  planId: number;
  centerId: number;
  planDate: string; // YYYY-MM-DD
  status: "Draft" | "Confirmed";
  statusText: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
  totalStaff: number;
  totalElderly: number;
  totalNormal: number;
  totalNeedSupport: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string | null;
  groups: StaffCareGroup[];
  unassignedElderly: ElderlyInGroup[];
  warnings: string[];
}

export interface AutoAssignRequest {
  targetDate?: string;
  notes?: string;
}

export interface ReassignElderlyRequest {
  planId: number;
  elderlyId: number;
  newStaffId: number;
  notes?: string;
}

export interface ConfirmScheduleRequest {
  planId: number;
  notes?: string;
}

export const staffAssignmentService = {
  /** Tự động chia lịch chăm sóc theo quy định (10 thường / 4 cần hỗ trợ) */
  async autoAssign(dto: AutoAssignRequest): Promise<ApiResponse<DailySchedulePlan>> {
    const res = await api.post("/api/center/staff-assignment/auto-assign", dto);
    return res.data;
  },

  /** Xem lại kế hoạch chia lịch của một ngày */
  async getSchedulePlan(date?: string): Promise<ApiResponse<DailySchedulePlan>> {
    const params = date ? { date } : {};
    const res = await api.get("/api/center/staff-assignment", { params });
    return res.data;
  },

  /** Chuyển người cao tuổi sang staff khác phụ trách */
  async reassignElderly(dto: ReassignElderlyRequest): Promise<ApiResponse<DailySchedulePlan>> {
    const res = await api.put("/api/center/staff-assignment/reassign", dto);
    return res.data;
  },

  /** Xác nhận lịch chăm sóc ngày mai */
  async confirmSchedule(dto: ConfirmScheduleRequest): Promise<ApiResponse<DailySchedulePlan>> {
    const res = await api.post("/api/center/staff-assignment/confirm", dto);
    return res.data;
  },

  /** Staff xem nhóm được phân công của mình */
  async getMyCareGroup(date?: string): Promise<ApiResponse<StaffCareGroup>> {
    const params = date ? { date } : {};
    const res = await api.get("/api/staff/my-group", { params });
    return res.data;
  },
};

export default staffAssignmentService;
