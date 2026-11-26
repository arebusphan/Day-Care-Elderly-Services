// Kiểu dữ liệu trả về từ BE (giống FE web: services/careLogService.ts, scheduleService.ts, ...)

export interface User {
  userId: number;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  roles: string[];
}
export interface AuthResult { token: string; expiresAt: string; user: User }

export interface Photo { photoId: number; careLogId: number; url: string; uploadedAt: string }
export interface CareLogEntry {
  careLogId: number;
  elderlyId: number;
  careType: string;
  description: string;
  notes: string | null;
  data: Record<string, unknown> | null;
  isInternal: boolean;
  packageActivityId?: number | null;
  recordedAt: string;
  staffId: number;
  staffName: string;
  photos: Photo[];
}
export interface CareLogDay {
  elderlyId: number;
  elderlyName: string;
  date: string;
  isMedicalDone: boolean;
  isClosed: boolean;
  closedBy: string | null;
  entries: CareLogEntry[];
}

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

export interface ElderlyInGroup {
  elderlyId: number;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  mobilityStatus: string;
  careNotes: string | null;
}
export interface MyGroup { groupName?: string; groupType?: string; elderlyList: ElderlyInGroup[] }

export interface Attendance {
  attendanceId: number;
  elderlyId: number;
  elderlyName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
}
export interface PickupPerson { pickupPersonId: number; fullName: string; relationship: string | null; phoneNumber: string }

export interface Dose {
  medicationRecordId: number;
  elderlyId: number;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduledAt: string;
  status: string;
  statusLabel: string;
  notes: string | null;
}
export interface Incident {
  incidentId: number;
  elderlyId: number;
  elderlyName: string;
  incidentType: string;
  severity: string;
  description: string;
  occurredAt: string;
  reportedByName: string;
  status: string;
  resolutionNotes: string | null;
}
export interface VitalsResult { entry: CareLogEntry; warnings: string[] }

export interface FamilyElderly { elderlyId: number; fullName: string; dateOfBirth?: string; age?: number; relationship: string }
export interface HealthHistory { vitals: CareLogEntry[]; doses: Dose[] }
