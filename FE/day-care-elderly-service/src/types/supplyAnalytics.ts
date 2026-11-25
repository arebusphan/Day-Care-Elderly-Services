/**
 * DTOs và Interfaces phục vụ phân tích, thống kê tiêu hao và cảnh báo hạn dùng vật tư y tế.
 * Tương ứng với backend DayCareElderlyService.BLL.DTOs.MedicalSupply (WF-05 / D2 / F-14 / SR-04).
 */

export interface SupplyConsumptionSummary {
  /** Tổng số lượng loại vật tư có trong danh mục */
  totalSupplies: number;
  /** Số loại vật tư đang kích hoạt sử dụng */
  activeSupplies: number;
  /** Số mặt hàng có tồn kho <= mức tồn tối thiểu */
  lowStockCount: number;
  /** Số mặt hàng sắp hết hạn (trong vòng 30 ngày) */
  expiringSoonCount: number;
  /** Số mặt hàng đã quá hạn sử dụng */
  expiredCount: number;
  /** Tổng giá trị tài sản kho vật tư y tế hiện tại (VNĐ) */
  totalInventoryValue: number;
  /** Tổng chi phí vật tư đã xuất cho các ca sự cố y tế (VNĐ) */
  totalIncidentSupplyCost: number;
}

export interface TopUsedSupply {
  supplyId: number;
  supplyName: string;
  unit: string;
  totalQuantityUsed: number;
  totalCost: number;
  usageCount: number;
  currentStock: number;
}

export type ExpiryAlertStatus = "Expired" | "Critical" | "Warning" | "Good";

export interface ExpiringSupplyAlert {
  supplyId: number;
  supplyName: string;
  unit: string;
  quantityInStock: number;
  unitPrice: number;
  expiryDate: string | null;
  daysUntilExpiry: number;
  status: ExpiryAlertStatus | string;
}

export interface ElderlySupplyChargeReport {
  elderlyId: number;
  fullName: string;
  incidentCount: number;
  totalSupplyCost: number;
  lastIncidentAt: string | null;
}

export interface SupplyAnalyticsQueryFilter {
  limit?: number;
  months?: number | null;
  thresholdDays?: number;
}

/** Format số tiền sang định dạng VNĐ */
export const formatVND = (amount: number): string =>
  `${(amount || 0).toLocaleString("vi-VN")} đ`;

/** Helper lấy thông tin badge trạng thái hạn sử dụng */
export const getExpiryStatusMeta = (
  status: ExpiryAlertStatus | string,
  daysUntilExpiry: number,
): { label: string; tone: "bad" | "warn" | "neutral" | "good"; badgeClass: string } => {
  if (status === "Expired" || daysUntilExpiry < 0) {
    return {
      label: `Đã hết hạn (${Math.abs(daysUntilExpiry)} ngày trước)`,
      tone: "bad",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    };
  }
  if (status === "Critical" || daysUntilExpiry <= 7) {
    return {
      label: `Khẩn cấp (còn ${daysUntilExpiry} ngày)`,
      tone: "bad",
      badgeClass: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    };
  }
  if (status === "Warning" || daysUntilExpiry <= 30) {
    return {
      label: `Sắp hết hạn (${daysUntilExpiry} ngày)`,
      tone: "warn",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    };
  }
  return {
    label: `Hạn dùng tốt (${daysUntilExpiry} ngày)`,
    tone: "good",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  };
};

/** Tính tỷ lệ phần trăm tiêu hao so với tổng tiêu thụ */
export const calculateUsagePercentage = (itemCost: number, totalCost: number): number => {
  if (!totalCost || totalCost <= 0) return 0;
  return Math.min(100, Math.round((itemCost / totalCost) * 100));
};
