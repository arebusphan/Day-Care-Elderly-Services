import api from "./api";
import type { ApiResponse, AuthResponseDto, LoginRequestDto, RegisterRequestDto, UserDto } from "../types/auth";

export const authService = {
  async login(payload: LoginRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await api.post<ApiResponse<AuthResponseDto>>("/api/Auth/login", payload);
    return response.data;
  },

  async register(payload: RegisterRequestDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await api.post<ApiResponse<AuthResponseDto>>("/api/Auth/register", payload);
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<UserDto>> {
    const response = await api.get<ApiResponse<UserDto>>("/api/Auth/me");
    return response.data;
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>("/api/Auth/change-password", payload);
    return response.data;
  },
};
