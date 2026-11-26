/**
 * Module tính toán nghiệp vụ và kiểm tra ràng buộc vật tư sự cố (WF-05 / D2 / F-14).
 * Cung cấp các hàm kiểm tra tính toàn vẹn dữ liệu, chống trừ âm kho (DS-10) và tính phụ phí vật tư.
 */

export interface SupplyItemChargeInput {
  supplyId: number;
  supplyName?: string;
  quantity: number;
  unitPrice: number;
}

export interface StockValidationResult {
  isValid: boolean;
  error?: string;
  isLowStockWarning?: boolean;
  remainingStock: number;
}

export type ExpiryRiskLevel = "Expired" | "Critical" | "Warning" | "Good";

export interface ExpiryRiskEvaluation {
  status: ExpiryRiskLevel;
  daysRemaining: number;
  isSafeToUse: boolean;
  warningMessage?: string;
}

/**
 * Tính phụ phí cho 1 mặt hàng vật tư (Số lượng x Đơn giá).
 * Làm tròn chuẩn số nguyên đồng VNĐ.
 */
export function calculateItemAmount(quantity: number, unitPrice: number): number {
  if (quantity <= 0 || unitPrice <= 0 || isNaN(quantity) || isNaN(unitPrice)) {
    return 0;
  }
  return Math.round(quantity * unitPrice);
}

/**
 * Tính tổng phụ phí vật tư y tế của một ca sự cố (F-14 / D2).
 */
export function calculateTotalSupplyCharges(items: SupplyItemChargeInput[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((total, item) => total + calculateItemAmount(item.quantity, item.unitPrice), 0);
}

/**
 * Kiểm tra nghiệp vụ xuất kho vật tư sơ cứu (DS-09 Main / DS-10 Exception - Insufficient Stock).
 * Ngăn chặn tuyệt đối việc trừ âm kho ở tầng giao diện trước khi gửi lên API.
 */
export function validateStockDeduction(
  requestedQuantity: number,
  quantityInStock: number,
  minimumStock = 0,
): StockValidationResult {
  if (isNaN(requestedQuantity) || requestedQuantity <= 0) {
    return {
      isValid: false,
      error: "Số lượng xuất kho phải là số dương lớn hơn 0.",
      remainingStock: quantityInStock,
    };
  }

  if (requestedQuantity > quantityInStock) {
    return {
      isValid: false,
      error: `Số lượng yêu cầu (${requestedQuantity}) vượt quá tồn kho khả dụng hiện tại (${quantityInStock}).`,
      remainingStock: quantityInStock,
    };
  }

  const remaining = quantityInStock - requestedQuantity;
  const isLowStockWarning = remaining <= minimumStock;

  return {
    isValid: true,
    isLowStockWarning,
    remainingStock: remaining,
  };
}

/**
 * Đánh giá rủi ro hạn sử dụng vật tư y tế theo ngưỡng ngày (SR-04).
 */
export function evaluateExpiryRisk(
  expiryDateStr?: string | null,
  warningThresholdDays = 30,
): ExpiryRiskEvaluation {
  if (!expiryDateStr) {
    return {
      status: "Good",
      daysRemaining: 9999,
      isSafeToUse: true,
    };
  }

  const expiry = new Date(expiryDateStr);
  const now = new Date();
  const expiryMidnight = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = expiryMidnight.getTime() - nowMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: "Expired",
      daysRemaining,
      isSafeToUse: false,
      warningMessage: `Vật tư đã hết hạn sử dụng ${Math.abs(daysRemaining)} ngày trước. Không được xuất cho ca sự cố!`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      status: "Critical",
      daysRemaining,
      isSafeToUse: true,
      warningMessage: `Cảnh báo khẩn cấp: Vật tư chỉ còn ${daysRemaining} ngày là hết hạn sử dụng.`,
    };
  }

  if (daysRemaining <= warningThresholdDays) {
    return {
      status: "Warning",
      daysRemaining,
      isSafeToUse: true,
      warningMessage: `Vật tư sắp hết hạn trong vòng ${daysRemaining} ngày.`,
    };
  }

  return {
    status: "Good",
    daysRemaining,
    isSafeToUse: true,
  };
}

/**
 * Tổng hợp tổng phụ phí theo từng người cao tuổi để đối soát thanh toán định kỳ.
 */
export function aggregateSupplyChargesByElderly(
  incidents: { elderlyId: number; elderlyName: string; supplyChargeAmount?: number }[],
): { elderlyId: number; elderlyName: string; incidentCount: number; totalCharge: number }[] {
  const map = new Map<number, { elderlyId: number; elderlyName: string; incidentCount: number; totalCharge: number }>();

  for (const inc of incidents) {
    const charge = inc.supplyChargeAmount || 0;
    const existing = map.get(inc.elderlyId);
    if (existing) {
      existing.incidentCount += 1;
      existing.totalCharge += charge;
    } else {
      map.set(inc.elderlyId, {
        elderlyId: inc.elderlyId,
        elderlyName: inc.elderlyName,
        incidentCount: 1,
        totalCharge: charge,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalCharge - a.totalCharge);
}
