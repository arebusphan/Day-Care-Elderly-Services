import api from "./api";

export interface CenterStaff {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  todayStatus: "Đi làm" | "Nghỉ";
  todayReason: string | null;
}

export interface CenterStaffFilter {
  search?: string;
  isActive?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateCenterStaffDto {
  fullName: string;
  email: string;
  phoneNumber?: string;
  temporaryPassword: string;
}

export interface DeactivationWarning {
  hasFutureSchedules: boolean;
  futureSchedulesCount: number;
  message: string | null;
}

/** Lịch làm việc theo ngày: isWorking = true (đi làm) / false (nghỉ) */
export interface StaffSchedule {
  scheduleId: number;
  staffId: number;
  workDate: string; // yyyy-MM-dd
  isWorking: boolean;
  note: string | null;
  createdAt: string;
}

export interface CreateStaffScheduleDto {
  workDate: string;
  isWorking: boolean;
  note?: string;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

const BASE = "/api/center/staff";

export const centerStaffService = {
  /** Lấy danh sách nhân viên */
  async getStaffList(filter: CenterStaffFilter = {}): Promise<ApiResponse<PagedResult<CenterStaff>>> {
    const params: Record<string, string> = {};
    if (filter.search) params.search = filter.search;
    if (filter.isActive !== undefined && filter.isActive !== null) {
      params.isActive = String(filter.isActive);
    }
    if (filter.pageNumber) params.pageNumber = String(filter.pageNumber);
    if (filter.pageSize) params.pageSize = String(filter.pageSize);

    const res = await api.get(BASE, { params });
    return res.data;
  },

  /** Thêm nhân viên mới */
  async createStaff(dto: CreateCenterStaffDto): Promise<ApiResponse<CenterStaff>> {
    const res = await api.post(BASE, dto);
    return res.data;
  },

  /** Kiểm tra cảnh báo trước khi ngừng hoạt động */
  async checkDeactivation(userId: number): Promise<ApiResponse<DeactivationWarning>> {
    const res = await api.get(`${BASE}/${userId}/deactivation-check`);
    return res.data;
  },

  /** Bật/tắt trạng thái hoạt động */
  async toggleStatus(userId: number): Promise<ApiResponse<boolean>> {
    const res = await api.patch(`${BASE}/${userId}/toggle-status`);
    return res.data;
  },

  /** Lấy lịch làm việc của nhân viên */
  async getSchedules(userId: number): Promise<ApiResponse<StaffSchedule[]>> {
    const res = await api.get(`${BASE}/${userId}/schedules`);
    return res.data;
  },

  /** Thêm/cập nhật lịch 1 ngày (BE tự upsert theo ngày) */
  async setSchedule(userId: number, dto: CreateStaffScheduleDto): Promise<ApiResponse<StaffSchedule>> {
    const res = await api.post(`${BASE}/${userId}/schedules`, dto);
    return res.data;
  },

  /** Xóa lịch 1 ngày */
  async deleteSchedule(userId: number, scheduleId: number): Promise<ApiResponse<boolean>> {
    const res = await api.delete(`${BASE}/${userId}/schedules/${scheduleId}`);
    return res.data;
  },
};

export default centerStaffService;
