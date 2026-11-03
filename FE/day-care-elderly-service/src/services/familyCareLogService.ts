import api from "./api";
import type { CareLogDay, CareLogEntry } from "./careLogService";

export interface CareLogDaySummary {
  date: string;
  entryCount: number;
  isMedicalDone: boolean;
  isClosed: boolean;
  lastRecordedAt: string;
}

export interface HealthHistory {
  elderlyId: number;
  from: string;
  to: string;
  vitals: CareLogEntry[];
  doses: DoseRecord[];
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

export interface FamilyIncident {
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

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const familyCareLogService = {
  async getDay(elderlyId: number, date?: string): Promise<CareLogDay> {
    const response = await api.get<ApiResponse<CareLogDay>>(
      `/api/family/care-logs/${elderlyId}`,
      { params: date ? { date } : undefined },
    );
    return response.data.data;
  },

  async getTimeline(elderlyId: number, days: number): Promise<CareLogDay[]> {
    const response = await api.get<ApiResponse<CareLogDay[]>>(
      `/api/family/care-logs/${elderlyId}/timeline`,
      { params: { days } },
    );
    return response.data.data ?? [];
  },

  async getHistory(elderlyId: number, from: string, to: string): Promise<CareLogDaySummary[]> {
    const response = await api.get<ApiResponse<CareLogDaySummary[]>>(
      `/api/family/care-logs/${elderlyId}/history`,
      { params: { from, to } },
    );
    return response.data.data ?? [];
  },

  async getHealth(elderlyId: number, days: number): Promise<HealthHistory> {
    const response = await api.get<ApiResponse<HealthHistory>>(
      `/api/family/care-logs/${elderlyId}/health`,
      { params: { days } },
    );
    return response.data.data;
  },

  async getIncidents(days: number): Promise<FamilyIncident[]> {
    const response = await api.get<ApiResponse<FamilyIncident[]>>("/api/family/incidents", { params: { days } });
    return response.data.data ?? [];
  },
};

export default familyCareLogService;
