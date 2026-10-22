export interface InvoiceRecord {
  id: string; // Mã hóa đơn, VD: HD-20261023-8821
  registrationCode: string; // Mã đăng ký, VD: DK-A8B9C1D2
  createdAt: string; // Thời gian tạo, VD: "23/10/2026 09:30"
  elderlyName: string;
  relationship?: string;
  packageName: string;
  serviceTypeLabel: string; // VD: "Theo tháng (Cả tuần T2-T7)" hoặc "Theo ngày (12 ngày)"
  roomTypeLabel: string; // VD: "Phòng Tiêu Chuẩn (4–6 người)" hoặc "Phòng VIP (1–2 người)"
  totalDays: number;
  datesDescription?: string;
  packagePrice: number;
  supportSurcharge: number;
  roomSurcharge: number;
  totalAmount: number;
  paymentMethod: string; // "Chuyển khoản QR (VietQR / VNPay)"
  status: "paid" | "pending" | "refunded";
  invoiceVatNo?: string; // Số hóa đơn điện tử VAT
}
