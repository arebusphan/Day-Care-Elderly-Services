import api from "./api";

// ── Types ──────────────────────────────────────────────

export interface UserDetail {
  userId: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  roles: string[];
}

export interface UserFilter {
  search?: string;
  roleName?: string;
  isActive?: boolean | null;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  roles: string[];
}

export interface UpdateUserDto {
  fullName: string;
  phoneNumber?: string;
  isActive: boolean;
  newPassword?: string;
  roles: string[];
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

// ── API Calls ──────────────────────────────────────────

const BASE = "/api/admin/users";

export const adminUserService = {
  /** Get paginated users with filters */
  async getUsers(filter: UserFilter = {}): Promise<ApiResponse<PagedResult<UserDetail>>> {
    const params: Record<string, string> = {};
    if (filter.search) params.search = filter.search;
    if (filter.roleName) params.roleName = filter.roleName;
    if (filter.isActive !== undefined && filter.isActive !== null)
      params.isActive = String(filter.isActive);
    if (filter.pageNumber) params.pageNumber = String(filter.pageNumber);
    if (filter.pageSize) params.pageSize = String(filter.pageSize);

    const res = await api.get(BASE, { params });
    return res.data;
  },

  /** Get available roles */
  async getRoles(): Promise<ApiResponse<string[]>> {
    const res = await api.get(`${BASE}/roles`);
    return res.data;
  },

  /** Get user by ID */
  async getUserById(id: string): Promise<ApiResponse<UserDetail>> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  /** Create new user */
  async createUser(dto: CreateUserDto): Promise<ApiResponse<UserDetail>> {
    const res = await api.post(BASE, dto);
    return res.data;
  },

  /** Update user */
  async updateUser(id: string, dto: UpdateUserDto): Promise<ApiResponse<UserDetail>> {
    const res = await api.put(`${BASE}/${id}`, dto);
    return res.data;
  },

  /** Toggle user active status */
  async toggleStatus(id: string): Promise<ApiResponse<null>> {
    const res = await api.patch(`${BASE}/${id}/toggle-status`);
    return res.data;
  },

  /** Delete user */
  async deleteUser(id: string): Promise<ApiResponse<null>> {
    const res = await api.delete(`${BASE}/${id}`);
    return res.data;
  },
};

export default adminUserService;
