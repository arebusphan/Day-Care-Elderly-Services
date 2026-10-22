import React, { useState, useEffect, useMemo } from "react";
import { billingApiService, formatCurrency } from "../../services/billingApiService";
import type { InvoiceRecord } from "../../types/billing";

interface BillingViewProps {
  onNavigateToServices?: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigateToServices }) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await billingApiService.getInvoices();
        if (res.success && res.data) {
          setInvoices(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách hóa đơn:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadInvoices();
  }, []);

  // Lọc danh sách hóa đơn theo tìm kiếm và trạng thái
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.registrationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.elderlyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.packageName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" ? true : inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, statusFilter]);


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
            Tài Chính & Chi Phí
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Hóa Đơn & Lịch Sử Giao Dịch
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý phiếu thu, hóa đơn điện tử và các khoản thanh toán gói dịch vụ bán trú cho người thân.
          </p>
        </div>

        {onNavigateToServices && (
          <button
            onClick={onNavigateToServices}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            + Đăng Ký Gói Dịch Vụ Mới
          </button>
        )}
      </div>


      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã hóa đơn, mã đăng ký, tên cụ, gói dịch vụ..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-800 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất Cả ({invoices.length})
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === "paid"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Đã Thanh Toán
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === "pending"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Chờ Xử Lý
          </button>
        </div>
      </div>

      {/* Danh sách hóa đơn */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-base font-bold text-slate-700">Không tìm thấy hóa đơn nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Bạn chưa có giao dịch nào phù hợp với bộ lọc tìm kiếm.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                <tr>
                  <th className="py-3 px-4">Mã Hóa Đơn / Ngày</th>
                  <th className="py-3 px-4">Người Thân Thụ Hưởng</th>
                  <th className="py-3 px-4">Gói & Loại Phòng</th>
                  <th className="py-3 px-4">Hình Thức</th>
                  <th className="py-3 px-4 text-right">Tổng Tiền</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-blue-700 font-mono text-xs block">
                        {inv.id}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mã ĐK: <b className="text-slate-600">{inv.registrationCode}</b>
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {inv.createdAt}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{inv.elderlyName}</span>
                      {inv.relationship && (
                        <span className="text-[11px] text-slate-500">
                          Quan hệ: <b>{inv.relationship}</b>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">
                        Gói {inv.packageName}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {inv.roomTypeLabel}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700 block">
                        {inv.serviceTypeLabel}
                      </span>
                      {inv.datesDescription && (
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {inv.datesDescription}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-black text-sm text-blue-700">
                        {formatCurrency(inv.totalAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {inv.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : inv.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {inv.status === "paid"
                          ? "✓ Đã Thanh Toán"
                          : inv.status === "pending"
                          ? "Chờ Xử Lý"
                          : "Đã Hủy"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                      >
                        Xem Phiếu Thu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL XEM CHI TIẾT PHIẾU THU / HÓA ĐƠN ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Phiếu Thu Điện Tử / Hóa Đơn Dịch Vụ
                </span>
                <h3 className="text-xl font-black mt-0.5">
                  {selectedInvoice.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-base transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Nội dung hóa đơn) */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 font-sans">
              {/* Header Trung tâm */}
              <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-4 gap-2">
                <div>
                  <h4 className="text-base font-black text-slate-900 uppercase">
                    Trung Tâm Chăm Sóc Người Cao Tuổi Ban Ngày
                  </h4>
                  <p className="text-slate-500 mt-0.5">
                    Địa chỉ: Số 123 Đường Hạnh Phúc, Quận Cầu Giấy, Hà Nội
                  </p>
                  <p className="text-slate-500">Hotline: 1900 6868 | Email: contact@daycare-elderly.vn</p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-slate-400 block">Số chứng từ VAT:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedInvoice.invoiceVatNo || "VAT-2026-ONLINE"}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">Ngày lập:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.createdAt}</span>
                </div>
              </div>

              {/* Thông tin khách hàng & người cao tuổi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase block">
                    Người cao tuổi thụ hưởng:
                  </span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {selectedInvoice.elderlyName}
                  </span>
                  {selectedInvoice.relationship && (
                    <span className="text-slate-500">
                      Mối quan hệ: <b>{selectedInvoice.relationship}</b>
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase block">
                    Mã đăng ký dịch vụ:
                  </span>
                  <span className="font-mono font-black text-blue-700 text-sm mt-0.5 block">
                    {selectedInvoice.registrationCode}
                  </span>
                  <span className="text-slate-500">
                    Phương thức: <b>{selectedInvoice.paymentMethod}</b>
                  </span>
                </div>
              </div>

              {/* Bảng kê chi phí */}
              <div>
                <h5 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-xs">
                  Chi Tiết Các Khoản Phí
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Khoản Mục Dịch Vụ</th>
                        <th className="p-3 text-center">Thời Gian / Số Lượng</th>
                        <th className="p-3 text-right">Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">
                            Gói Chăm Sóc {selectedInvoice.packageName}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {selectedInvoice.serviceTypeLabel} ({selectedInvoice.datesDescription})
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold">
                          {selectedInvoice.totalDays} ngày
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">
                          {formatCurrency(selectedInvoice.packagePrice)}
                        </td>
                      </tr>

                      {selectedInvoice.supportSurcharge > 0 && (
                        <tr>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">
                              Phụ phí hỗ trợ vận động tăng cường
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Chăm sóc di chuyển chuyên biệt theo tình trạng sức khỏe
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {selectedInvoice.totalDays} ngày
                          </td>
                          <td className="p-3 text-right font-bold text-amber-700">
                            + {formatCurrency(selectedInvoice.supportSurcharge)}
                          </td>
                        </tr>
                      )}

                      {selectedInvoice.roomSurcharge > 0 && (
                        <tr>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">
                              Phụ phí phòng VIP (1–2 người)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Không gian riêng biệt, yên tĩnh tuyệt đối
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {selectedInvoice.totalDays} ngày
                          </td>
                          <td className="p-3 text-right font-bold text-amber-700">
                            + {formatCurrency(selectedInvoice.roomSurcharge)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-sm">
                      <tr>
                        <td colSpan={2} className="p-3 text-right text-slate-800">
                          TỔNG THANH TOÁN (ĐÃ GỒM VAT):
                        </td>
                        <td className="p-3 text-right text-blue-700 font-black text-base">
                          {formatCurrency(selectedInvoice.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Dấu xác nhận điện tử */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="text-slate-500 text-[11px]">
                  <p>Trạng thái: <b className="text-emerald-700">✓ Đã quyết toán thành công</b></p>
                  <p>Hóa đơn điện tử có giá trị pháp lý lưu trữ tại trung tâm.</p>
                </div>
                <div className="text-center p-3 border border-emerald-300 bg-emerald-50 rounded-xl text-emerald-800">
                  <span className="text-[10px] font-bold uppercase block tracking-wider">
                    Xác Nhận Ký Số Điện Tử
                  </span>
                  <span className="font-bold text-xs">TRUNG TÂM DAY CARE</span>
                  <span className="text-[10px] block text-emerald-600 mt-0.5">
                    {selectedInvoice.createdAt}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={handlePrint}
                className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                In Phiếu Thu
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingView;
