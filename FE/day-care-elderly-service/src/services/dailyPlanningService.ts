import api from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AttendanceSummaryBlock {
  totalExpected: number;
  totalAbsent: number;
  totalNotConfirmed: number;
  totalNormal: number;
  totalSupport: number;
}

export interface GroupSummaryItem {
  groupId: number;
  groupName: string;
  groupType: "Normal" | "Support";
  currentCount: number;
  maxCapacity: number;
  staffName: string | null;
  isFull: boolean;
}

export interface StaffSummaryBlock {
  totalWorking: number;
  totalOff: number;
  totalLeave: number;
  totalAssigned: number;
  totalUnassigned: number;
}

export interface ElderlyInGroup {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  mobilityStatus: string;
  careNotes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  assignmentId: number | null;
}

export interface StaffCareGroup {
  groupId: number;
  groupName: string;
  groupType: "Normal" | "Support";
  staffId: number | null;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  normalElderlyCount: number;
  needSupportElderlyCount: number;
  elderlyList: ElderlyInGroup[];
}

export interface DailyPlanSummary {
  planId: number;
  planDate: string;
  status: "Draft" | "ReadyToReview" | "Published";
  statusLabel: string;
  totalAttending: number;
  totalNormal: number;
  totalSupport: number;
  totalWorkingStaff: number;
  totalGroups: number;
  totalAssigned: number;
  totalUnassigned: number;
  attendanceSummary: AttendanceSummaryBlock;
  groupSummary: GroupSummaryItem[];
  staffSummary: StaffSummaryBlock;
  assignmentSummary: StaffCareGroup[];
  warnings: string[];
  publishedAt: string | null;
  publishedByName: string | null;
}

export interface PlanHistoryItem {
  planId: number;
  planDate: string;
  status: "Draft" | "ReadyToReview" | "Confirmed" | "Published";
  statusLabel: string;
  totalElderly: number;
  totalStaff: number;
  totalGroups: number;
  confirmedAt: string | null;
  confirmedByName: string | null;
  createdAt: string;
  notes: string | null;
}

export interface AttendanceForecastItem {
  elderlyId: number;
  memberCode: string;
  fullName: string;
  mobilityStatus: string;
  gender: string | null;
  dateOfBirth: string | null;
  servicePackageName: string | null;
  careGroupName: string | null;
  attendanceStatus: "Expected" | "Absent" | "NotConfirmed";
  reason: string | null;
}

export interface AttendanceForecastResult {
  planId: number;
  planDate: string;
  planStatus: string;
  totalExpected: number;
  totalAbsent: number;
  totalNotConfirmed: number;
  totalNormal: number;
  totalSupport: number;
  items: AttendanceForecastItem[];
}

export interface GroupMemberItem {
  elderlyId: number;
  memberCode: string;
  fullName: string;
  mobilityStatus: string;
  servicePackageName: string | null;
}

export interface CareGroupDetail {
  groupId: number;
  groupName: string;
  groupType: "Normal" | "Support";
  maxCapacity: number;
  staffId: number | null;
  staffName: string | null;
  members: GroupMemberItem[];
  currentCount: number;
  isFull: boolean;
}

export interface GroupArrangementResult {
  planId: number;
  normalGroups: CareGroupDetail[];
  supportGroups: CareGroupDetail[];
  unassigned: GroupMemberItem[];
}

export interface StaffAvailabilityItem {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  availability: "Working" | "Off" | "Leave";
  note: string | null;
}

export interface StaffAvailabilityResult {
  date: string;
  totalWorking: number;
  totalOff: number;
  totalLeave: number;
  requiredNormalStaff: number;
  requiredSupportStaff: number;
  hasEnoughStaff: boolean;
  staff: StaffAvailabilityItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

// ── Service ────────────────────────────────────────────────────────────────

const BASE = "/api/center/planning";

export const dailyPlanningService = {
  // INIT
  async getOrInitPlan(date: string): Promise<ApiResponse<DailyPlanSummary>> {
    const res = await api.get(`${BASE}/${date}`);
    return res.data;
  },

  // STEP 1: Attendance
  async getAttendanceForecast(planId: number): Promise<ApiResponse<AttendanceForecastResult>> {
    const res = await api.get(`${BASE}/${planId}/attendance`);
    return res.data;
  },

  async updateAttendance(
    planId: number,
    elderlyId: number,
    status: string,
    reason?: string
  ): Promise<ApiResponse<AttendanceForecastResult>> {
    const res = await api.put(`${BASE}/${planId}/attendance`, { elderlyId, attendanceStatus: status, reason });
    return res.data;
  },

  async bulkUpdateAttendance(
    planId: number,
    updates: { elderlyId: number; attendanceStatus: string; reason?: string }[]
  ): Promise<ApiResponse<AttendanceForecastResult>> {
    const res = await api.put(`${BASE}/${planId}/attendance/bulk`, { updates });
    return res.data;
  },

  // STEP 2: Groups
  async getGroupArrangement(planId: number): Promise<ApiResponse<GroupArrangementResult>> {
    const res = await api.get(`${BASE}/${planId}/groups`);
    return res.data;
  },

  async createCareGroup(planId: number, groupName: string, groupType: "Normal" | "Support"): Promise<ApiResponse<GroupArrangementResult>> {
    const res = await api.post(`${BASE}/${planId}/groups`, { groupName, groupType });
    return res.data;
  },

  async deleteCareGroup(planId: number, groupId: number): Promise<ApiResponse<GroupArrangementResult>> {
    const res = await api.delete(`${BASE}/${planId}/groups/${groupId}`);
    return res.data;
  },

  async moveElderlyToGroup(planId: number, elderlyId: number, targetGroupId: number): Promise<ApiResponse<GroupArrangementResult>> {
    const res = await api.put(`${BASE}/${planId}/groups/move`, { elderlyId, targetGroupId });
    return res.data;
  },

  // STEP 3: Staff Availability
  async getStaffAvailability(date: string): Promise<ApiResponse<StaffAvailabilityResult>> {
    const res = await api.get(`${BASE}/${date}/staff-availability`);
    return res.data;
  },

  async updateStaffAvailability(
    date: string,
    staffId: number,
    availability: string,
    note?: string
  ): Promise<ApiResponse<StaffAvailabilityResult>> {
    const res = await api.put(`${BASE}/${date}/staff-availability`, { staffId, availability, note });
    return res.data;
  },

  // STEP 4: Generate & Reassign Staff
  async generateAssignment(planId: number): Promise<ApiResponse<any>> {
    const res = await api.post(`${BASE}/${planId}/generate-assignment`);
    return res.data;
  },

  async assignStaffToGroup(planId: number, groupId: number, staffId: number | null): Promise<ApiResponse<any>> {
    const res = await api.put(`${BASE}/${planId}/groups/assign-staff`, { groupId, staffId });
    return res.data;
  },

  // STEP 5: Summary & Publish
  async getPlanSummary(planId: number): Promise<ApiResponse<DailyPlanSummary>> {
    const res = await api.get(`${BASE}/${planId}/summary`);
    return res.data;
  },

  async publishPlan(planId: number): Promise<ApiResponse<DailyPlanSummary>> {
    const res = await api.post(`${BASE}/${planId}/publish`);
    return res.data;
  },

  // HISTORY
  async getPlanHistory(): Promise<ApiResponse<PlanHistoryItem[]>> {
    const res = await api.get(`${BASE}/history`);
    return res.data;
  },
};

export default dailyPlanningService;
