import api from "./api";
import type { ApiResponse } from "../types/common";

export type StaffRequestType = "Leave" | "ShiftChange";
export type StaffRequestStatus = "Pending" | "Approved" | "Rejected";

export interface StaffRequest {
  requestId: number;
  staffId: number;
  staffName: string;
  requestType: StaffRequestType;
  requestDate: string;
  swapWithStaffId: number | null;
  swapWithStaffName: string | null;
  reason: string | null;
  status: StaffRequestStatus;
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface MyScheduleDay {
  date: string;
  isSunday: boolean;
  availability: "Working" | "Off" | "Leave" | "Closed";
  note: string | null;
  group: { groupName: string; groupType: string; members: number; planStatus: string } | null;
  requests: string[];
}

export const REQUEST_TYPE_LABEL: Record<StaffRequestType, string> = { Leave: "Xin nghỉ", ShiftChange: "Đổi ca" };
export const REQUEST_STATUS_LABEL: Record<StaffRequestStatus, string> = { Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Từ chối" };

/** SRS 3.10.2: đơn nghỉ / đổi ca và lịch của tôi */
export const staffRequestService = {
  async mine(): Promise<ApiResponse<StaffRequest[]>> {
    return (await api.get("/api/staff/requests")).data;
  },
  async create(dto: { requestType: StaffRequestType; requestDate: string; swapWithStaffId?: number | null; reason?: string }): Promise<ApiResponse<StaffRequest>> {
    return (await api.post("/api/staff/requests", dto)).data;
  },
  async cancel(id: number): Promise<ApiResponse<boolean>> {
    return (await api.delete(`/api/staff/requests/${id}`)).data;
  },
  async colleagues(): Promise<ApiResponse<{ userId: number; fullName: string }[]>> {
    return (await api.get("/api/staff/colleagues")).data;
  },
  async mySchedule(days = 14): Promise<ApiResponse<MyScheduleDay[]>> {
    return (await api.get("/api/staff/my-schedule", { params: { days } })).data;
  },
  async all(status?: string): Promise<ApiResponse<StaffRequest[]>> {
    return (await api.get("/api/center/staff-requests", { params: status ? { status } : {} })).data;
  },
  async review(id: number, approve: boolean, note?: string): Promise<ApiResponse<StaffRequest>> {
    return (await api.post(`/api/center/staff-requests/${id}/review`, { approve, note })).data;
  },
};

export default staffRequestService;
