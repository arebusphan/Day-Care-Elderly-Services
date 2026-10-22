import api from "./api";
import type { CreateElderlyProfileDto, ElderlyProfileDto, ApiResponse } from "../types/elderly";

export const elderlyService = {
  // Tạo hồ sơ người cao tuổi mới
  createElderlyProfile: async (data: CreateElderlyProfileDto): Promise<ApiResponse<ElderlyProfileDto>> => {
    const response = await api.post<ApiResponse<ElderlyProfileDto>>("/api/family/elderly", data);
    return response.data;
  },

  // Lấy danh sách hồ sơ người cao tuổi của user hiện tại
  getMyElderlyProfiles: async (): Promise<ApiResponse<ElderlyProfileDto[]>> => {
    const response = await api.get<ApiResponse<ElderlyProfileDto[]>>("/api/family/elderly");
    return response.data;
  },

  // Lấy chi tiết hồ sơ người cao tuổi theo ID
  getElderlyProfileById: async (id: string): Promise<ApiResponse<ElderlyProfileDto>> => {
    const response = await api.get<ApiResponse<ElderlyProfileDto>>(`/api/family/elderly/${id}`);
    return response.data;
  },

  // Chỉnh sửa hồ sơ người cao tuổi
  updateElderlyProfile: async (id: string, data: CreateElderlyProfileDto): Promise<ApiResponse<ElderlyProfileDto>> => {
    const response = await api.put<ApiResponse<ElderlyProfileDto>>(`/api/family/elderly/${id}`, data);
    return response.data;
  },

  // Xóa hồ sơ người cao tuổi
  deleteElderlyProfile: async (id: string): Promise<ApiResponse<boolean>> => {
    const response = await api.delete<ApiResponse<boolean>>(`/api/family/elderly/${id}`);
    return response.data;
  },
};

export default elderlyService;
