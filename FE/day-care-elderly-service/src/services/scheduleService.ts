import api from "./api";

/** Lịch hoạt động theo gói (docs/thiet-ke-lich-hoat-dong-theo-goi.md) */

export interface PackageScheduleSummary {
  packageId: number;
  packageName: string;
  isActive: boolean;
  activityCount: number;
}

export interface PackageActivity {
  packageActivityId: number;
  packageId: number;
  /** null = mọi ngày T2–T7; 1 = Thứ 2 … 6 = Thứ 7 */
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  activityName: string;
  purpose: string | null;
  careType: string;
  targetMinutes: number | null;
  performerRole: "Nurse" | "Caregiver" | "Any";
  isRequired: boolean;
  conditionCode: string | null;
  source: string | null;
  displayOrder: number;
  isActive: boolean;
}

export type UpsertPackageActivity = Omit<PackageActivity, "packageActivityId" | "packageId" | "displayOrder" | "isActive">;

export type ScheduleStatus = "Done" | "Skipped" | "Overdue" | "Pending";

export interface ScheduleItem {
  packageActivityId: number;
  startTime: string;
  endTime: string;
  activityName: string;
  purpose: string | null;
  careType: string;
  targetMinutes: number | null;
  performerRole: string;
  isRequired: boolean;
  conditionCode: string | null;
  status: ScheduleStatus;
  careLogId: number | null;
  recordedAt: string | null;
  staffName: string | null;
  note: string | null;
}

export interface ScheduleDay {
  elderlyId: number;
  elderlyName: string;
  date: string;
  packageId: number | null;
  packageName: string | null;
  chronicConditions: string[];
  requiredCount: number;
  doneCount: number;
  skippedCount: number;
  items: ScheduleItem[];
}

export interface ScheduleWeekItem {
  activityName: string;
  plannedSessions: number;
  doneSessions: number;
  skippedSessions: number;
  plannedMinutes: number;
  doneMinutes: number;
}

export interface ScheduleWeek {
  elderlyId: number;
  weekStart: string;
  weekEnd: string;
  packageName: string | null;
  activityMinutesDone: number;
  activityMinutesPlanned: number;
  items: ScheduleWeekItem[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const DAY_LABELS: Record<number, string> = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
export const ROLE_LABELS: Record<string, string> = { Nurse: "Điều dưỡng", Caregiver: "Hộ lý", Any: "Bất kỳ" };
export const CONDITION_LABELS: Record<string, string> = { DIABETES: "Tiểu đường", HYPERTENSION: "Tăng huyết áp", HEART: "Tim mạch" };
export const STATUS_LABELS: Record<ScheduleStatus, string> = { Done: "Đã làm", Skipped: "Bỏ qua", Overdue: "Trễ", Pending: "Chưa làm" };

const scheduleService = {
  // ── Staff ──
  async getStaffDay(elderlyId: number, date?: string): Promise<ScheduleDay> {
    const response = await api.get<ApiResponse<ScheduleDay>>(`/api/staff/care-logs/${elderlyId}/schedule`, { params: { date } });
    return response.data.data;
  },
  async getStaffWeek(elderlyId: number, date?: string): Promise<ScheduleWeek> {
    const response = await api.get<ApiResponse<ScheduleWeek>>(`/api/staff/care-logs/${elderlyId}/schedule/week`, { params: { date } });
    return response.data.data;
  },

  // ── Gia đình ──
  async getFamilyDay(elderlyId: number, date?: string): Promise<ScheduleDay> {
    const response = await api.get<ApiResponse<ScheduleDay>>(`/api/family/care-logs/${elderlyId}/schedule`, { params: { date } });
    return response.data.data;
  },

  // ── Quản lý / Admin ──
  async getPackages(): Promise<PackageScheduleSummary[]> {
    const response = await api.get<ApiResponse<PackageScheduleSummary[]>>("/api/center/packages");
    return response.data.data ?? [];
  },
  async getActivities(packageId: number, includeInactive = false): Promise<PackageActivity[]> {
    const response = await api.get<ApiResponse<PackageActivity[]>>(`/api/center/packages/${packageId}/activities`, { params: { includeInactive } });
    return response.data.data ?? [];
  },
  async createActivity(packageId: number, dto: UpsertPackageActivity): Promise<PackageActivity> {
    const response = await api.post<ApiResponse<PackageActivity>>(`/api/center/packages/${packageId}/activities`, dto);
    return response.data.data;
  },
  async updateActivity(id: number, dto: UpsertPackageActivity): Promise<PackageActivity> {
    const response = await api.put<ApiResponse<PackageActivity>>(`/api/center/package-activities/${id}`, dto);
    return response.data.data;
  },
  async setActive(id: number, isActive: boolean): Promise<PackageActivity> {
    const response = await api.patch<ApiResponse<PackageActivity>>(`/api/center/package-activities/${id}/active`, { isActive });
    return response.data.data;
  },
};

export default scheduleService;
