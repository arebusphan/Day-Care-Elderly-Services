// API cho các chức năng ngoài care log (cùng endpoint với FE web)
import { api } from "./api";
import type {
  AbsenceReport, AttendanceRecord, ChatMessage, Conversation, ElderlyProfile, FamilyOverview, Invoice, MedicationPlan, MyScheduleDay,
  NotificationList, PickupPersonFull, RegistrationResult, SaveElderlyProfile, SaveMedicationPlan, SavePickupPerson, ServicePackage,
  StaffOverview, StaffRequest, StaffRequestType,
} from "./types2";

export const accountApi = {
  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => api.post<unknown>("/api/Auth/change-password", body),
  notifications: (unreadOnly = false, take = 50) => api.get<NotificationList>("/api/notifications", { unreadOnly, take }),
  markRead: (id: number) => api.patch<unknown>(`/api/notifications/${id}/read`, {}),
  markAllRead: () => api.post<unknown>("/api/notifications/read-all"),
};

export const messageApi = {
  conversations: () => api.get<Conversation[]>("/api/messages/conversations"),
  start: (elderlyId: number) => api.post<Conversation>("/api/messages/conversations", { elderlyId }),
  messages: (conversationId: number) => api.get<ChatMessage[]>(`/api/messages/conversations/${conversationId}/messages`),
  send: (conversationId: number, content: string) => api.post<ChatMessage>(`/api/messages/conversations/${conversationId}/messages`, { content }),
};

export const staffMoreApi = {
  overview: () => api.get<StaffOverview>("/api/staff/overview"),
  plans: (elderlyId: number) => api.get<MedicationPlan[]>(`/api/staff/elderly/${elderlyId}/medication-plans`),
  createPlan: (elderlyId: number, body: SaveMedicationPlan) => api.post<MedicationPlan>(`/api/staff/elderly/${elderlyId}/medication-plans`, body),
  updatePlan: (planId: number, body: SaveMedicationPlan) => api.put<MedicationPlan>(`/api/staff/medication-plans/${planId}`, body),
  generateDoses: (planId: number, scheduleTimes: string[]) => api.post<{ createdCount: number; skippedExistingCount: number }>(`/api/staff/medication-plans/${planId}/doses/generate`, { scheduleTimes }),
  mySchedule: (days = 14) => api.get<MyScheduleDay[]>("/api/staff/my-schedule", { days }),
  myRequests: () => api.get<StaffRequest[]>("/api/staff/requests"),
  createRequest: (body: { requestType: StaffRequestType; requestDate: string; swapWithStaffId?: number | null; reason?: string }) => api.post<StaffRequest>("/api/staff/requests", body),
  cancelRequest: (id: number) => api.del<boolean>(`/api/staff/requests/${id}`),
  colleagues: () => api.get<{ userId: number; fullName: string }[]>("/api/staff/colleagues"),
};

export const familyMoreApi = {
  overview: () => api.get<FamilyOverview>("/api/family/overview"),
  profiles: () => api.get<ElderlyProfile[]>("/api/family/elderly"),
  profile: (id: number) => api.get<ElderlyProfile>(`/api/family/elderly/${id}`),
  createProfile: (body: SaveElderlyProfile) => api.post<ElderlyProfile>("/api/family/elderly", body),
  updateProfile: (id: number, body: SaveElderlyProfile) => api.put<ElderlyProfile>(`/api/family/elderly/${id}`, body),
  deleteProfile: (id: number) => api.del<unknown>(`/api/family/elderly/${id}`),
  pickupPersons: (elderlyId: number) => api.get<PickupPersonFull[]>(`/api/family/elderly/${elderlyId}/pickup-persons`),
  addPickup: (elderlyId: number, body: SavePickupPerson) => api.post<PickupPersonFull>(`/api/family/elderly/${elderlyId}/pickup-persons`, body),
  updatePickup: (id: number, body: SavePickupPerson) => api.put<PickupPersonFull>(`/api/family/pickup-persons/${id}`, body),
  removePickup: (id: number) => api.del<unknown>(`/api/family/pickup-persons/${id}`),
  absences: () => api.get<AbsenceReport[]>("/api/family/absences"),
  reportAbsence: (elderlyId: number, absenceDate: string, reason?: string) => api.post<AbsenceReport>("/api/family/absences", { elderlyId, absenceDate, reason }),
  cancelAbsence: (id: number) => api.del<unknown>(`/api/family/absences/${id}`),
  attendanceHistory: (elderlyId: number) => api.get<AttendanceRecord[]>(`/api/attendance/elderly/${elderlyId}/history`),
  packages: () => api.get<ServicePackage[]>("/api/family/packages"),
  register: (body: Record<string, unknown>) => api.post<RegistrationResult>("/api/family/packages/register", body),
  invoices: () => api.get<Invoice[]>("/api/family/billing/invoices"),
};
