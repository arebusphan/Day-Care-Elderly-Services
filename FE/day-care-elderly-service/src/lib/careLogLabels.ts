// Nhãn tiếng Việt cho care log (loại mục, trường dữ liệu, sự cố) dùng chung cho màn staff và gia đình.

export const careTypeLabels: Record<string, string> = {
  MEAL: "Ăn uống",
  HYGIENE: "Vệ sinh",
  NAP: "Nghỉ ngơi",
  MOOD: "Tâm trạng",
  ACTIVITY: "Hoạt động",
  NOTE: "Ghi chú",
  VITALS: "Chỉ số sức khỏe",
  MEDICATION: "Thuốc",
  MEDICAL_DONE: "Hoàn tất y tế",
  CLOSE: "Chốt ngày",
  SKIP: "Bỏ qua hoạt động",
};

/** Trường trong CareLog.Data: nhãn + đơn vị. Trường không có ở đây và không nằm trong HIDDEN_FIELDS thì hiện tên gốc. */
export const dataFieldLabels: Record<string, { label: string; unit?: string }> = {
  systolicBp: { label: "Huyết áp tâm thu", unit: "mmHg" },
  diastolicBp: { label: "Huyết áp tâm trương", unit: "mmHg" },
  heartRate: { label: "Nhịp tim", unit: "lần/phút" },
  spO2: { label: "SpO₂", unit: "%" },
  temperature: { label: "Nhiệt độ", unit: "°C" },
  bloodGlucose: { label: "Đường huyết", unit: "mmol/L" },
  weight: { label: "Cân nặng", unit: "kg" },
  medicationName: { label: "Thuốc" },
  dosage: { label: "Liều" },
  status: { label: "Trạng thái" },
  portion: { label: "Khẩu phần" },
  severity: { label: "Mức cảnh báo" },
};

/** Trường kỹ thuật, không hiện cho người dùng. warnings hiện riêng thành khối cảnh báo. */
export const HIDDEN_FIELDS = new Set(["medicationRecordId", "medicationPlanId", "scheduledAt", "tone", "warnings"]);

const valueLabels: Record<string, Record<string, string>> = {
  status: { Given: "Đã uống", Refused: "Từ chối uống", Missed: "Thiếu thuốc", Pending: "Chưa uống" },
  portion: { full: "Ăn hết", most: "Ăn gần hết", half: "Ăn một nửa", little: "Ăn ít", none: "Không ăn" },
};

export const severityLabels: Record<string, string> = {
  Low: "Thấp",
  Medium: "Trung bình",
  High: "Cao",
  Critical: "Nguy hiểm",
};

export const incidentStatusLabels: Record<string, string> = {
  Open: "Chưa xử lý",
  InProgress: "Đang xử lý",
  Resolved: "Đã xử lý",
};

export const incidentTypeLabels: Record<string, string> = {
  VITALS_ALERT: "Cảnh báo chỉ số",
  STROKE: "Nghi đột quỵ",
  LOST: "Mất dấu",
  FALL: "Ngã",
  OTHER: "Sự cố khác",
};

export const formatDataValue = (key: string, value: unknown): string => {
  if (key === "severity") return severityLabels[String(value)] ?? String(value);
  const mapped = valueLabels[key]?.[String(value)];
  if (mapped) return mapped;
  const unit = dataFieldLabels[key]?.unit;
  return unit ? `${String(value)} ${unit}` : String(value);
};

/** warnings trong Data là mảng chuỗi; dữ liệu cũ có thể là chuỗi nối bằng "; ". */
export const readWarnings = (data: Record<string, unknown> | null | undefined): string[] => {
  const raw = data?.warnings;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return raw.split(/;\s*/).filter(Boolean);
  return [];
};
