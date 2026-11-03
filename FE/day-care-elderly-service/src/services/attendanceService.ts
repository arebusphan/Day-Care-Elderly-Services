import api from "./api";

export interface AttendanceItem {
  attendanceId: number;
  elderlyId: number;
  elderlyName: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
}

export type AttendanceDetail = AttendanceItem;

interface ApiResponse<T> { success: boolean; message?: string; data: T }

const attendanceService = {
  async getByDate(date: string) {
    const response = await api.get<ApiResponse<AttendanceItem[]>>("/api/attendance", { params: { date } });
    return response.data.data ?? [];
  },
  async getPresentToday() {
    const response = await api.get<ApiResponse<AttendanceItem[]>>("/api/attendance/present-today");
    return response.data.data ?? [];
  },
  async checkIn(elderlyId: number) {
    const response = await api.post<ApiResponse<unknown>>("/api/attendance/check-in", { elderlyId });
    return response.data;
  },
  async checkOut(elderlyId: number) {
    const response = await api.post<ApiResponse<unknown>>("/api/attendance/check-out", { elderlyId });
    return response.data;
  },
  async getHistory(elderlyId: number) {
    const response = await api.get<ApiResponse<AttendanceItem[]>>(`/api/attendance/elderly/${elderlyId}/history`);
    return response.data.data ?? [];
  },
  async getDetail(attendanceId: number) {
    const response = await api.get<ApiResponse<AttendanceDetail>>(`/api/attendance/${attendanceId}`);
    return response.data.data;
  },
};

export default attendanceService;
