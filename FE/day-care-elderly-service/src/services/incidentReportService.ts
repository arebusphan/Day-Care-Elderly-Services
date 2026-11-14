import api from "./api";
import { cleanParams } from "../types/common";
import type { ApiResponse, PagedResult } from "../types/common";

export type IncidentStatus = "Open" | "InProgress" | "Resolved";
export type IncidentSeverity = "Low" | "Medium" | "High" | "Critical";

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  Open: "Mới",
  InProgress: "Đang xử lý",
  Resolved: "Đã xử lý",
};

export const INCIDENT_SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
  Critical: "Nghiêm trọng",
};

export interface IncidentReport {
  incidentId: number;
  elderlyId: number;
  elderlyName: string;
  centerId: number;
  centerName: string;
  reportedBy: number;
  reportedByName: string;
  incidentType: string;
  severity: IncidentSeverity;
  description: string;
  occurredAt: string;
  reportedAt: string;
  status: IncidentStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  isSupplyConfirmed: boolean;
}

export interface IncidentFilter {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  elderlyId?: number;
  isSupplyConfirmed?: boolean;
  search?: string;
}

export interface CreateIncidentReportDto {
  elderlyId: number;
  incidentType: string;
  severity: IncidentSeverity;
  description: string;
  occurredAt?: string;
}

export interface UpdateIncidentReportDto {
  incidentType: string;
  severity: IncidentSeverity;
  description: string;
  occurredAt?: string;
  resolutionNotes?: string;
}

const BASE = "/api/incident-reports";

export const incidentReportService = {
  async list(filter: IncidentFilter): Promise<ApiResponse<PagedResult<IncidentReport>>> {
    const res = await api.get(BASE, { params: cleanParams(filter) });
    return res.data;
  },

  async get(id: number): Promise<ApiResponse<IncidentReport>> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data;
  },

  async create(dto: CreateIncidentReportDto): Promise<ApiResponse<IncidentReport>> {
    const res = await api.post(BASE, dto);
    return res.data;
  },

  async update(id: number, dto: UpdateIncidentReportDto): Promise<ApiResponse<IncidentReport>> {
    const res = await api.put(`${BASE}/${id}`, dto);
    return res.data;
  },

  async updateStatus(id: number, status: IncidentStatus, resolutionNotes?: string): Promise<ApiResponse<IncidentReport>> {
    const res = await api.patch(`${BASE}/${id}/status`, { status, resolutionNotes });
    return res.data;
  },

  async confirmSupply(id: number, isSupplyConfirmed: boolean, notes?: string): Promise<ApiResponse<IncidentReport>> {
    const res = await api.patch(`${BASE}/${id}/supply-confirmation`, { isSupplyConfirmed, notes });
    return res.data;
  },

  async remove(id: number): Promise<ApiResponse<boolean>> {
    const res = await api.delete(`${BASE}/${id}`);
    return res.data;
  },
};

export default incidentReportService;
