import api from "./api";

export interface CenterStaff {
  userId: string;
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
  futureLeavesCount: number;
  futureShiftsCount: number;
  message: string | null;
}

export interface StaffLeave {
  leaveId: string;
  userId: string;
  leaveDate: string;
  reason: string | null;
  createdAt: string;
}

export interface CreateStaffLeaveDto {
  leaveDate: string;
  reason?: string;
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
  async checkDeactivation(userId: string): Promise<ApiResponse<DeactivationWarning>> {
    const res = await api.get(`${BASE}/${userId}/deactivation-check`);
    return res.data;
  },

  /** Bật/tắt trạng thái hoạt động */
  async toggleStatus(userId: string): Promise<ApiResponse<boolean>> {
    const res = await api.patch(`${BASE}/${userId}/toggle-status`);
    return res.data;
  },

  /** Lấy danh sách ngày nghỉ */
  async getLeaves(userId: string): Promise<ApiResponse<StaffLeave[]>> {
    const res = await api.get(`${BASE}/${userId}/leaves`);
    return res.data;
  },

  /** Thêm ngày nghỉ */
  async addLeave(userId: string, dto: CreateStaffLeaveDto): Promise<ApiResponse<StaffLeave>> {
    const res = await api.post(`${BASE}/${userId}/leaves`, dto);
    return res.data;
  },

  /** Xóa ngày nghỉ */
  async deleteLeave(userId: string, leaveId: string): Promise<ApiResponse<boolean>> {
    const res = await api.delete(`${BASE}/${userId}/leaves/${leaveId}`);
    return res.data;
  },
};

export default centerStaffService;
