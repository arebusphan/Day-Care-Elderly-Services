// Nhãn tiếng Việt, giống FE web (src/lib/careLogLabels.ts, services/scheduleService.ts)
import type { ScheduleStatus } from "./types";

export const careTypeLabels: Record<string, string> = {
  MEAL: "Ăn uống", HYGIENE: "Vệ sinh", NAP: "Nghỉ ngơi", MOOD: "Tâm trạng", ACTIVITY: "Hoạt động",
  NOTE: "Ghi chú", VITALS: "Chỉ số sức khỏe", MEDICATION: "Thuốc", MEDICAL_DONE: "Hoàn tất y tế",
  CLOSE: "Chốt ngày", SKIP: "Bỏ qua hoạt động",
};
/** Loại staff tự ghi được */
export const MANUAL_TYPES = ["MEAL", "HYGIENE", "NAP", "MOOD", "ACTIVITY", "NOTE"];
/** Loại staff sửa được (mục của chính mình, hôm nay) */
export const EDITABLE_TYPES = [...MANUAL_TYPES, "SKIP"];

export const statusLabels: Record<ScheduleStatus, string> = { Done: "Đã làm", Skipped: "Bỏ qua", Overdue: "Trễ", Pending: "Chưa làm" };
export const roleLabels: Record<string, string> = { Nurse: "Điều dưỡng", Caregiver: "Hộ lý", Any: "Bất kỳ" };
export const conditionLabels: Record<string, string> = { DIABETES: "Tiểu đường", HYPERTENSION: "Tăng huyết áp", HEART: "Tim mạch" };

export const severityLabels: Record<string, string> = { Low: "Thấp", Medium: "Trung bình", High: "Cao", Critical: "Nguy hiểm" };
export const incidentStatusLabels: Record<string, string> = { Open: "Chưa xử lý", InProgress: "Đang xử lý", Resolved: "Đã xử lý" };
export const incidentTypeLabels: Record<string, string> = {
  VITALS_ALERT: "Cảnh báo chỉ số", STROKE: "Nghi đột quỵ", LOST: "Mất dấu", FALL: "Ngã", LATE_PICKUP: "Đón trễ", OTHER: "Sự cố khác",
};

export const dataFieldLabels: Record<string, { label: string; unit?: string }> = {
  systolicBp: { label: "Huyết áp tâm thu", unit: "mmHg" },
  diastolicBp: { label: "Huyết áp tâm trương", unit: "mmHg" },
  heartRate: { label: "Nhịp tim", unit: "lần/phút" },
  spO2: { label: "SpO₂", unit: "%" },
  temperature: { label: "Nhiệt độ", unit: "°C" },
  bloodGlucose: { label: "Đường huyết", unit: "mmol/L" },
  medicationName: { label: "Thuốc" },
  dosage: { label: "Liều" },
  severity: { label: "Mức cảnh báo" },
};
export const HIDDEN_FIELDS = new Set(["medicationRecordId", "medicationPlanId", "scheduledAt", "tone", "warnings", "status"]);

export const formatField = (key: string, value: unknown) => {
  if (key === "severity") return severityLabels[String(value)] ?? String(value);
  const unit = dataFieldLabels[key]?.unit;
  return unit ? `${String(value)} ${unit}` : String(value);
};
export const readWarnings = (data: Record<string, unknown> | null | undefined): string[] => {
  const raw = data?.warnings;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw) return raw.split(/;\s*/);
  return [];
};
