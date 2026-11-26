// Các API dùng trên mobile (cùng endpoint với FE web)
import { api, today } from "./api";
import type {
  Attendance, AuthResult, CareLogDay, CareLogEntry, Dose, FamilyElderly, HealthHistory, Incident,
  MyGroup, Photo, PickupPerson, ScheduleDay, VitalsResult,
} from "./types";

type PickedPhoto = { uri: string; fileName?: string | null; mimeType?: string | null; file?: File };

export const authApi = {
  login: (email: string, password: string) => api.post<AuthResult>("/api/auth/login", { email, password }),
};

export const staffApi = {
  myGroup: () => api.get<MyGroup>("/api/staff/my-group", { date: today() }),
  attendance: () => api.get<Attendance[]>("/api/attendance", { date: today() }),
  checkIn: (elderlyId: number) => api.post<unknown>("/api/attendance/check-in", { elderlyId }),
  pickupPersons: (elderlyId: number) => api.get<PickupPerson[]>(`/api/attendance/elderly/${elderlyId}/pickup-persons`),
  checkOut: (body: { elderlyId: number; pickupPersonId?: number; idCardLast4?: string; overrideReason?: string }) =>
    api.post<unknown>("/api/attendance/check-out", body),

  day: (elderlyId: number) => api.get<CareLogDay>(`/api/staff/care-logs/${elderlyId}`, { date: today() }),
  schedule: (elderlyId: number) => api.get<ScheduleDay>(`/api/staff/care-logs/${elderlyId}/schedule`, { date: today() }),
  addEntry: (elderlyId: number, body: { careType: string; description: string; notes?: string; isInternal: boolean; packageActivityId?: number }) =>
    api.post<CareLogEntry>(`/api/staff/care-logs/${elderlyId}`, body),
  updateEntry: (careLogId: number, body: { description: string; notes?: string; isInternal: boolean }) =>
    api.put<CareLogEntry>(`/api/staff/care-logs/entries/${careLogId}`, body),
  uploadPhotos: (careLogId: number, photos: PickedPhoto[]) => api.upload<Photo[]>(`/api/staff/care-logs/entries/${careLogId}/photos`, "files", photos),
  recordVitals: (elderlyId: number, body: Record<string, number | string | undefined>) =>
    api.post<VitalsResult>(`/api/staff/care-logs/${elderlyId}/vitals`, body),
  markMedicalDone: (elderlyId: number) => api.post<CareLogEntry>(`/api/staff/care-logs/${elderlyId}/medical-done`, {}),
  closeDay: (elderlyId: number) => api.post<CareLogEntry>(`/api/staff/care-logs/${elderlyId}/close`, {}),

  doses: () => api.get<Dose[]>("/api/staff/doses/today"),
  updateDose: (id: number, status: string, notes?: string) => api.patch<Dose>(`/api/staff/doses/${id}`, { status, notes }),

  incidents: () => api.get<Incident[]>("/api/staff/incidents", { days: 30 }),
  createIncident: (elderlyId: number, incidentType: string, description: string) =>
    api.post<Incident>("/api/staff/incidents", { elderlyId, incidentType, description }),
  updateIncident: (id: number, status: "InProgress" | "Resolved", resolutionNotes?: string) =>
    api.patch<Incident>(`/api/staff/incidents/${id}`, { status, resolutionNotes }),
};

export const familyApi = {
  elderly: () => api.get<FamilyElderly[]>("/api/family/elderly"),
  schedule: (elderlyId: number) => api.get<ScheduleDay>(`/api/family/care-logs/${elderlyId}/schedule`, { date: today() }),
  timeline: (elderlyId: number, days = 7) => api.get<CareLogDay[]>(`/api/family/care-logs/${elderlyId}/timeline`, { days }),
  health: (elderlyId: number, days = 30) => api.get<HealthHistory>(`/api/family/care-logs/${elderlyId}/health`, { days }),
  incidents: (days = 30) => api.get<Incident[]>("/api/family/incidents", { days }),
};
