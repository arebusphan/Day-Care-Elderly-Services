import api from "./api";

export interface CareLogPhoto {
  photoId: number;
  careLogId: number;
  url: string;
  uploadedAt: string;
}

export interface CareLogEntry {
  careLogId: number;
  elderlyId: number;
  careType: string;
  description: string;
  notes: string | null;
  data: Record<string, unknown> | null;
  isInternal: boolean;
  centerActivityId: number | null;
  activityName: string | null;
  recordedAt: string;
  staffId: number;
  staffName: string;
  jobTitle: string;
  photos: CareLogPhoto[];
}

export interface CareLogDay {
  elderlyId: number;
  elderlyName: string;
  date: string;
  isMedicalDone: boolean;
  medicalDoneAt: string | null;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  entries: CareLogEntry[];
}

export interface StaffElderlyToday {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  mobilityStatus: string | null;
  allergies: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  entryCount: number;
  lastRecordedAt: string | null;
  isMedicalDone: boolean;
  isClosed: boolean;
}

export interface CreateCareLogEntry {
  careType: string;
  description: string;
  notes?: string;
  data?: Record<string, unknown>;
  isInternal: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const careLogService = {
  async getTodayElderly(): Promise<StaffElderlyToday[]> {
    const response = await api.get<ApiResponse<StaffElderlyToday[]>>("/api/staff/elderly/today");
    return response.data.data ?? (response.data as unknown as StaffElderlyToday[]);
  },
  async getDay(elderlyId: number, date: string): Promise<CareLogDay> {
    const response = await api.get<ApiResponse<CareLogDay>>(`/api/staff/care-logs/${elderlyId}`, { params: { date } });
    return response.data.data;
  },
  async addEntry(elderlyId: number, entry: CreateCareLogEntry): Promise<CareLogEntry> {
    const response = await api.post<ApiResponse<CareLogEntry>>(`/api/staff/care-logs/${elderlyId}`, entry);
    return response.data.data;
  },
};

export default careLogService;
