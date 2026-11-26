/**
 * Bộ kiểm thử đơn vị logic tính toán vật tư sự cố (Unit Tests - WF-05 / D2 / F-14 / DS-09 / DS-10).
 * Kiểm tra các ca kịch bản chính, ca ngoại lệ và tính toàn vẹn phụ phí trên client.
 */

import {
  calculateItemAmount,
  calculateTotalSupplyCharges,
  validateStockDeduction,
  evaluateExpiryRisk,
  aggregateSupplyChargesByElderly,
} from "./incidentSupplyCalculations";

describe("Incident Supply Calculations & Business Rule Tests (WF-05 / F-14)", () => {
  describe("calculateItemAmount", () => {
    it("should calculate exact amount for valid positive quantity and price", () => {
      // 3 cuộn băng gạc x 15.000 đ = 45.000 đ
      const result = calculateItemAmount(3, 15000);
      expect(result).toBe(45000);
    });

    it("should return 0 when quantity is zero or negative", () => {
      expect(calculateItemAmount(0, 20000)).toBe(0);
      expect(calculateItemAmount(-2, 20000)).toBe(0);
    });

    it("should return 0 when unit price is zero or negative", () => {
      expect(calculateItemAmount(5, 0)).toBe(0);
      expect(calculateItemAmount(5, -1000)).toBe(0);
    });

    it("should round decimal quantities cleanly to nearest integer VND", () => {
      // 1.5 mét nẹp x 30.500 đ = 45.750 đ
      expect(calculateItemAmount(1.5, 30500)).toBe(45750);
    });
  });

  describe("calculateTotalSupplyCharges (F-14 / D2)", () => {
    it("should aggregate itemized charges across multiple used first-aid supplies", () => {
      const items = [
        { supplyId: 1, supplyName: "Băng gạc tiệt trùng", quantity: 3, unitPrice: 15000 }, // 45.000
        { supplyId: 2, supplyName: "Cồn đỏ Povidine", quantity: 1, unitPrice: 25000 },    // 25.000
        { supplyId: 3, supplyName: "Gạc vô trùng đắp vết thương", quantity: 2, unitPrice: 10000 }, // 20.000
      ];

      const total = calculateTotalSupplyCharges(items);
      expect(total).toBe(90000);
    });

    it("should return 0 when item list is empty", () => {
      expect(calculateTotalSupplyCharges([])).toBe(0);
    });
  });

  describe("validateStockDeduction (DS-09 Main & DS-10 Exception - Insufficient Stock)", () => {
    it("DS-09: should approve deduction when stock is strictly sufficient", () => {
      // Kho còn 10 cuộn, xuất 3 cuộn, mức tồn tối thiểu 2 cuộn
      const result = validateStockDeduction(3, 10, 2);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.remainingStock).toBe(7);
      expect(result.isLowStockWarning).toBe(false); // 7 > 2 => an toàn
    });

    it("DS-09 with Low Stock Alert: should flag low stock warning when remaining stock <= minStock", () => {
      // Kho còn 4 cuộn, xuất 3 cuộn => còn 1 (dưới mức tối thiểu 2)
      const result = validateStockDeduction(3, 4, 2);

      expect(result.isValid).toBe(true);
      expect(result.remainingStock).toBe(1);
      expect(result.isLowStockWarning).toBe(true);
    });

    it("DS-10 Exception: should reject deduction when requested quantity exceeds available stock", () => {
      // Kho còn 2 lọ, cố tình yêu cầu xuất 5 lọ (vượt tồn)
      const result = validateStockDeduction(5, 2, 1);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("vượt quá tồn kho khả dụng");
      expect(result.remainingStock).toBe(2); // Kho không bị suy giảm
    });

    it("should reject negative or zero requested quantities", () => {
      const zeroReq = validateStockDeduction(0, 10, 2);
      expect(zeroReq.isValid).toBe(false);
      expect(zeroReq.error).toContain("phải là số dương");

      const negReq = validateStockDeduction(-1, 10, 2);
      expect(negReq.isValid).toBe(false);
      expect(negReq.error).toContain("phải là số dương");
    });
  });

  describe("evaluateExpiryRisk (SR-04)", () => {
    it("should classify expired supplies as Expired and unsafe to use", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 ngày trước

      const evalResult = evaluateExpiryRisk(pastDate.toISOString());
      expect(evalResult.status).toBe("Expired");
      expect(evalResult.isSafeToUse).toBe(false);
      expect(evalResult.warningMessage).toContain("đã hết hạn");
    });

    it("should classify supplies expiring within 7 days as Critical", () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 3); // 3 ngày nữa

      const evalResult = evaluateExpiryRisk(soonDate.toISOString());
      expect(evalResult.status).toBe("Critical");
      expect(evalResult.isSafeToUse).toBe(true);
      expect(evalResult.warningMessage).toContain("Cảnh báo khẩn cấp");
    });

    it("should classify supplies expiring within 30 days as Warning", () => {
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 20); // 20 ngày nữa

      const evalResult = evaluateExpiryRisk(warningDate.toISOString());
      expect(evalResult.status).toBe("Warning");
      expect(evalResult.isSafeToUse).toBe(true);
    });

    it("should classify supplies expiring after threshold as Good", () => {
      const safeDate = new Date();
      safeDate.setDate(safeDate.getDate() + 180); // 6 tháng nữa

      const evalResult = evaluateExpiryRisk(safeDate.toISOString());
      expect(evalResult.status).toBe("Good");
      expect(evalResult.isSafeToUse).toBe(true);
    });
  });

  describe("aggregateSupplyChargesByElderly", () => {
    it("should group and sum supply charges correctly by elderlyId and sort descending", () => {
      const incidentList = [
        { elderlyId: 101, elderlyName: "Cụ Nguyễn Văn An", supplyChargeAmount: 45000 },
        { elderlyId: 102, elderlyName: "Cụ Trần Thị Bình", supplyChargeAmount: 120000 },
        { elderlyId: 101, elderlyName: "Cụ Nguyễn Văn An", supplyChargeAmount: 30000 },
      ];

      const report = aggregateSupplyChargesByElderly(incidentList);

      expect(report).toHaveLength(2);
      // Top 1: Cụ Trần Thị Bình (120.000)
      expect(report[0].elderlyId).toBe(102);
      expect(report[0].totalCharge).toBe(120000);
      expect(report[0].incidentCount).toBe(1);

      // Top 2: Cụ Nguyễn Văn An (45.000 + 30.000 = 75.000)
      expect(report[1].elderlyId).toBe(101);
      expect(report[1].totalCharge).toBe(75000);
      expect(report[1].incidentCount).toBe(2);
    });
  });
});
