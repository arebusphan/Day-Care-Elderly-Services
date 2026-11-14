import api from "./api";
import type { ApiResponse } from "../types/common";

export interface CenterDashboard {
  date: string;
  plan: { planId: number; status: string; totalElderly: number; totalStaff: number } | null;
  nextPlan: { date: string; status: string };
  attendance: { expected: number; checkedIn: number; present: number; left: number; absenceReported: number };
  medication: { total: number; given: number; refused: number; missed: number; pending: number; overdue: number };
  incidents: { today: number; open: number; openBySeverity: { severity: string; count: number }[] };
  careLogs: { entries: number; closed: number };
  supplies: {
    lowStock: { supplyId: number; supplyName: string; quantityInStock: number; minimumStock: number; unit: string }[];
    expiringIn30Days: number;
  };
  pendingStaffRequests: number;
}

export interface CenterReport {
  from: string;
  to: string;
  attendance: { totalVisits: number; averagePerDay: number; byDay: { date: string; count: number }[] };
  incidents: {
    total: number;
    resolved: number;
    bySeverity: { severity: string; count: number }[];
    byType: { type: string; count: number }[];
    supplyCharges: number;
  };
  medication: { due: number; given: number; refused: number; missed: number; notRecorded: number; complianceRate: number };
  revenue: { paidAmount: number; newRegistrations: number };
  supplyUsage: { supplyId: number; supplyName: string; unit: string; quantity: number }[];
  staffWorkload: { staffId: number; fullName: string; assignments: number; days: number }[];
}

export type MemberStatus = "Present" | "Left" | "NotArrived" | "Absent";

export interface StaffOverview {
  date: string;
  hasPublishedPlan: boolean;
  group: { groupName: string; groupType: string } | null;
  members: {
    elderlyId: number;
    fullName: string;
    allergies: string | null;
    status: MemberStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    entries: number;
    hasVitals: boolean;
    medicalDone: boolean;
    closed: boolean;
  }[];
  doses: {
    total: number;
    pending: number;
    overdue: number;
    next: { medicationRecordId: number; scheduledAt: string; medicationName: string; elderlyName: string }[];
  };
  openIncidents: number;
  unreadNotifications: number;
}

export interface FamilyOverview {
  date: string;
  unreadNotifications: number;
  members: {
    elderlyId: number;
    fullName: string;
    status: MemberStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    pickupName: string | null;
    entriesToday: number;
    latestActivity: { careType: string; description: string; recordedAt: string } | null;
    latestVitals: { recordedAt: string; bloodPressure: string | null; bloodGlucose: number | null } | null;
    doses: { total: number; given: number; pending: number };
    openIncidents: { incidentType: string; severity: string; occurredAt: string }[];
    packages: { packageName: string; endDate: string | null }[];
    upcomingAbsences: string[];
  }[];
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  Present: "Đang ở trung tâm",
  Left: "Đã về",
  NotArrived: "Chưa đến",
  Absent: "Báo vắng",
};

export const overviewService = {
  async centerDashboard(date?: string): Promise<ApiResponse<CenterDashboard>> {
    return (await api.get("/api/center/dashboard", { params: date ? { date } : {} })).data;
  },
  async centerReport(from: string, to: string): Promise<ApiResponse<CenterReport>> {
    return (await api.get("/api/center/reports", { params: { from, to } })).data;
  },
  async staffOverview(): Promise<ApiResponse<StaffOverview>> {
    return (await api.get("/api/staff/overview")).data;
  },
  async familyOverview(): Promise<ApiResponse<FamilyOverview>> {
    return (await api.get("/api/family/overview")).data;
  },
};

export default overviewService;
