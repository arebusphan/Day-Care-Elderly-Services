// Kiểu dữ liệu cho các chức năng ngoài care log (giống FE web services/*.ts)

export type MemberStatus = "Present" | "Left" | "NotArrived" | "Absent";
export const memberStatusLabels: Record<MemberStatus, string> = {
  Present: "Đang ở trung tâm", Left: "Đã về", NotArrived: "Chưa đến", Absent: "Vắng",
};

export interface StaffOverview {
  date: string;
  hasPublishedPlan: boolean;
  group: { groupName: string; groupType: string } | null;
  members: {
    elderlyId: number; fullName: string; allergies: string | null; status: MemberStatus;
    checkInAt: string | null; checkOutAt: string | null; entries: number; hasVitals: boolean; medicalDone: boolean; closed: boolean;
  }[];
  doses: { total: number; pending: number; overdue: number; next: { medicationRecordId: number; scheduledAt: string; medicationName: string; elderlyName: string }[] };
  openIncidents: number;
  unreadNotifications: number;
}

export interface FamilyOverview {
  date: string;
  unreadNotifications: number;
  members: {
    elderlyId: number; fullName: string; status: MemberStatus; checkInAt: string | null; checkOutAt: string | null; pickupName: string | null;
    entriesToday: number;
    latestActivity: { careType: string; description: string; recordedAt: string } | null;
    latestVitals: { recordedAt: string; bloodPressure: string | null; bloodGlucose: number | null } | null;
    doses: { total: number; given: number; pending: number };
    openIncidents: { incidentType: string; severity: string; occurredAt: string }[];
    packages: { packageName: string; endDate: string | null }[];
    upcomingAbsences: string[];
  }[];
}

export interface Conversation {
  conversationId: number; elderlyId: number; elderlyName: string; familyUserId: number; familyName: string;
  staffUserId: number; staffName: string; lastMessageAt: string | null; lastMessage: string | null; unreadCount: number;
}
export interface ChatMessage { messageId: number; senderUserId: number; senderName: string; isMine: boolean; content: string; sentAt: string; readAt: string | null }

export interface NotificationItem {
  notificationId: number; title: string; message: string; notificationType: string;
  relatedEntityType: string | null; relatedEntityId: number | null; isRead: boolean; createdAt: string;
}
export interface NotificationList { unreadCount: number; items: NotificationItem[] }

export type StaffRequestType = "Leave" | "ShiftChange";
export type StaffRequestStatus = "Pending" | "Approved" | "Rejected";
export interface StaffRequest {
  requestId: number; requestType: StaffRequestType; requestDate: string; swapWithStaffName: string | null; reason: string | null;
  status: StaffRequestStatus; reviewerName: string | null; reviewNote: string | null; createdAt: string;
}
export interface MyScheduleDay {
  date: string; isSunday: boolean; availability: "Working" | "Off" | "Leave" | "Closed"; note: string | null;
  group: { groupName: string; groupType: string; members: number; planStatus: string } | null; requests: string[];
}
export const requestTypeLabels: Record<StaffRequestType, string> = { Leave: "Xin nghỉ", ShiftChange: "Đổi ca" };
export const requestStatusLabels: Record<StaffRequestStatus, string> = { Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Từ chối" };
export const availabilityLabels: Record<MyScheduleDay["availability"], string> = { Working: "Đi làm", Off: "Nghỉ ca", Leave: "Nghỉ phép", Closed: "Trung tâm nghỉ" };

export interface MedicationPlan {
  medicationPlanId: number; elderlyId: number; elderlyName: string; medicationName: string; dosage: string; instructions: string | null;
  scheduleTimes: string[]; startDate: string; endDate: string | null; isActive: boolean; createdAt: string; pendingDoseCount: number;
}
export interface SaveMedicationPlan {
  medicationName: string; dosage: string; instructions?: string; scheduleTimes: string[]; startDate: string; endDate?: string | null; isActive: boolean; generateDays?: number;
}

export interface ElderlyProfile {
  elderlyId: number; fullName: string; dateOfBirth?: string; age?: number; gender?: string; address?: string; relationship: string;
  emergencyContactName: string; emergencyContactPhone: string; allergies?: string; medicalHistory?: string; medicalNotes?: string;
  mobilityStatus: string; careNotes?: string; isActive: boolean;
}
export interface SaveElderlyProfile {
  fullName: string; dateOfBirth: string; gender: string; relationship: string; emergencyContactName: string; emergencyContactPhone: string;
  address?: string; allergies?: string; medicalHistory?: string; medicalNotes?: string; mobilityStatus: string; careNotes?: string;
}

export interface PickupPersonFull { pickupPersonId: number; elderlyId: number; fullName: string; relationship: string | null; phoneNumber: string; idCardLast4: string }
export interface SavePickupPerson { fullName: string; relationship?: string | null; phoneNumber: string; idCardLast4: string }
export interface AbsenceReport { absenceId: number; elderlyId: number; elderlyName: string; absenceDate: string; reason: string | null; createdAt: string }
export interface AttendanceRecord { attendanceId: number; elderlyId: number; elderlyName: string; attendanceDate: string; checkInAt: string | null; checkOutAt: string | null; status: string }

export interface ServicePackage {
  packageId: number | string; packageName: string; description?: string; pricePerDay: number; priceMonth3Days: number; priceMonthFullWeek: number;
  highlights: string[]; includedServices: string[]; targetAudience?: string; pricingNote?: string; totalSlots: number; availableSlots: number;
  endOfLifeRoomIncluded: boolean; isActive: boolean;
}
export interface RegistrationResult { registrationCode: string; invoiceNo: string; totalAmount: number; status: string }
export interface Invoice {
  id: string; registrationCode: string; createdAt: string; elderlyName: string; relationship?: string; packageName: string;
  serviceTypeLabel: string; roomTypeLabel: string; totalDays: number; datesDescription?: string; packagePrice: number;
  supportSurcharge: number; roomSurcharge: number; totalAmount: number; paymentMethod: string; status: "paid" | "pending" | "refunded"; invoiceVatNo?: string;
}
export const money = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} đ`;
