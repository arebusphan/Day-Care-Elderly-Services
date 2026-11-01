export interface CreateElderlyProfileDto {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string; // "Male" | "Female" | "Other"
  relationship: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address?: string;
  allergies?: string;
  medicalHistory?: string;
  medicalNotes?: string;
  mobilityStatus: string; // "Normal" | "Support"
  careNotes?: string;
}

export interface ElderlyProfileDto {
  elderlyId: number;
  centerId: number;
  centerName: string;
  fullName: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  address?: string;
  relationship: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies?: string;
  medicalHistory?: string;
  medicalNotes?: string;
  mobilityStatus: string;
  careNotes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
