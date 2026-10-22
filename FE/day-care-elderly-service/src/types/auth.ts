export interface UserDto {
  userId: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  roles: string[];
}

export interface AuthResponseDto {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: UserDto;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
}
