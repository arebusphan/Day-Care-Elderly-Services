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

export interface DoseRecord {
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

export interface StaffIncident {
  incidentId: number;
  elderlyId: number;
  elderlyName: string;
  incidentType: string;
  severity: string;
  description: string;
  occurredAt: string;
  reportedAt: string;
  reportedByName: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
}

export interface RecordVitalsInput {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  spO2?: number;
  temperature?: number;
  bloodGlucose?: number;
  notes?: string;
}

export interface VitalsResult {
  entry: CareLogEntry;
  warnings: string[];
  severity: string | null;
  incidentId: number | null;
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
  async uploadPhotos(careLogId: number, files: File[]): Promise<CareLogPhoto[]> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const response = await api.post<ApiResponse<CareLogPhoto[]>>(`/api/staff/care-logs/entries/${careLogId}/photos`, form, { headers: { "Content-Type": "multipart/form-data" } });
    return response.data.data ?? [];
  },
  async deletePhoto(photoId: number): Promise<void> {
    await api.delete(`/api/staff/care-logs/photos/${photoId}`);
  },
  async recordVitals(elderlyId: number, input: RecordVitalsInput): Promise<VitalsResult> {
    const response = await api.post<ApiResponse<VitalsResult>>(`/api/staff/care-logs/${elderlyId}/vitals`, input);
    return response.data.data;
  },
  async getTodayDoses(): Promise<DoseRecord[]> {
    const response = await api.get<ApiResponse<DoseRecord[]>>("/api/staff/doses/today");
    return response.data.data ?? [];
  },
  async updateDose(id: number, status: "Given" | "Refused" | "Missed", notes?: string): Promise<DoseRecord> {
    const response = await api.patch<ApiResponse<DoseRecord>>(`/api/staff/doses/${id}`, { status, notes });
    return response.data.data;
  },
  async getIncidents(status?: string, days = 30): Promise<StaffIncident[]> {
    const response = await api.get<ApiResponse<StaffIncident[]>>("/api/staff/incidents", { params: { status, days } });
    return response.data.data ?? [];
  },
  async createIncident(input: { elderlyId: number; incidentType: string; severity?: string; description: string }): Promise<StaffIncident> {
    const response = await api.post<ApiResponse<StaffIncident>>("/api/staff/incidents", input);
    return response.data.data;
  },
  async updateIncident(id: number, status: "InProgress" | "Resolved", resolutionNotes?: string): Promise<StaffIncident> {
    const response = await api.patch<ApiResponse<StaffIncident>>(`/api/staff/incidents/${id}`, { status, resolutionNotes });
    return response.data.data;
  },
};

export default careLogService;
