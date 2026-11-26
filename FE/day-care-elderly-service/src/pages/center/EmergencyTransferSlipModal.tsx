import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  FileText,
  Package,
  Printer,
  ShieldAlert,
  User,
  UserCheck,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import incidentReportService, {
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
} from "../../services/incidentReportService";
import type { IncidentReport, IncidentSupplyUsage } from "../../services/incidentReportService";
import { formatDateTimeVN } from "../../lib/date";

interface Props {
  incident: IncidentReport | null;
  open: boolean;
  onClose: () => void;
}

const money = (n: number) => `${(n || 0).toLocaleString("vi-VN")} đ`;

export function EmergencyTransferSlipModal({ incident, open, onClose }: Props) {
  const [supplies, setSupplies] = useState<IncidentSupplyUsage[]>([]);
  const [loadingSupplies, setLoadingSupplies] = useState(false);

  useEffect(() => {
    if (!incident || !open) return;
    setLoadingSupplies(true);
    incidentReportService
      .getSupplies(incident.incidentId)
      .then((res) => setSupplies(res.data ?? []))
      .catch(() => setSupplies([]))
      .finally(() => setLoadingSupplies(false));
  }, [incident, open]);

  if (!incident) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl print:p-0 print:border-none print:shadow-none print:max-w-full">
        {/* Nút in và tiêu đề dialog (ẩn khi in) */}
        <div className="print:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-700">
                <FileText className="size-5" />
                <DialogTitle>Phiếu bàn giao y tế & chuyển viện khẩn cấp</DialogTitle>
              </div>
            </div>
            <DialogDescription>
              Hồ sơ bàn giao y tế ban đầu dùng khi điều chuyển người cao tuổi sang bệnh viện cấp cứu (SRS 3.9.1 / WF-05).
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* NỘI DUNG PHIẾU IN (In ấn chuẩn quy cách bệnh án bàn giao) */}
        <div className="printable-slip mt-2 rounded-lg border bg-white p-6 text-slate-800 shadow-xs print:m-0 print:border-none print:p-6 print:text-black dark:bg-slate-950 dark:text-slate-100">
          {/* Header Quốc hiệu / Tên Trung tâm */}
          <div className="flex flex-wrap items-start justify-between border-b pb-4 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-sky-800 dark:text-sky-400">
                {incident.centerName || "TRUNG TÂM DƯỠNG LÃO BAN NGÀY CAO TUỔI"}
              </p>
              <p className="text-slate-500">Bộ phận Y tế & Chăm sóc Thường nhật</p>
              <p className="text-slate-500">Mã cơ sở: #{incident.centerId}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold uppercase">Mẫu số: 05-YTE/BG-CV</p>
              <p className="text-slate-500">Mã sự cố: <span className="font-bold text-rose-600">#INC-{incident.incidentId}</span></p>
              <p className="text-slate-500">Ngày lập phiếu: {currentDateStr}</p>
            </div>
          </div>

          {/* Tiêu đề chính */}
          <div className="my-5 text-center">
            <h2 className="text-lg font-bold uppercase tracking-wide text-slate-900 dark:text-white">
              GIẤY BÀN GIAO CẤP CỨU & CHUYỂN VIỆN
            </h2>
            <p className="text-xs text-slate-500 italic">
              (Dành cho kíp cấp cứu, nhân viên áp tải và cơ sở khám chữa bệnh tiếp nhận)
            </p>
          </div>

          {/* 1. Thông tin người cao tuổi */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-sky-900 dark:text-sky-300">
              <User className="size-3.5" /> 1. Thông tin Người cao tuổi (Bệnh nhân)
            </h3>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3 text-xs sm:grid-cols-3 dark:bg-slate-900">
              <div>
                <span className="text-slate-500">Họ và tên: </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{incident.elderlyName}</span>
              </div>
              <div>
                <span className="text-slate-500">Mã hồ sơ: </span>
                <span className="font-medium">#{incident.elderlyId}</span>
              </div>
              <div>
                <span className="text-slate-500">Hình thức: </span>
                <span>Bán trú ban ngày</span>
              </div>
            </div>
          </div>

          {/* 2. Diễn biến sự cố & Đánh giá sơ bộ */}
          <div className="mt-4 space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-sky-900 dark:text-sky-300">
              <AlertTriangle className="size-3.5 text-amber-600" /> 2. Diễn biến sự cố & Đánh giá sơ bộ
            </h3>
            <div className="space-y-1.5 rounded-md border p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500">Loại sự cố: </span>
                  <span className="font-bold text-rose-700 dark:text-rose-400">{incident.incidentType}</span>
                </div>
                <div>
                  <span className="text-slate-500">Mức độ nghiêm trọng: </span>
                  <Badge variant={incident.severity === "Critical" ? "destructive" : "secondary"}>
                    {INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500">Thời điểm xảy ra: </span>
                  <span className="font-medium">{formatDateTimeVN(incident.occurredAt)}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Người phát hiện & báo cáo: </span>
                <span className="font-medium">{incident.reportedByName}</span> (Lúc: {formatDateTimeVN(incident.reportedAt)})
              </div>
              <div className="mt-1">
                <span className="text-slate-500">Mô tả chi tiết triệu chứng / hiện trường: </span>
                <p className="mt-0.5 rounded-sm bg-slate-50 p-2 font-mono text-[11px] leading-relaxed dark:bg-slate-900">
                  {incident.description}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Xử lý ban đầu & Vật tư y tế đã sử dụng */}
          <div className="mt-4 space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-sky-900 dark:text-sky-300">
              <Package className="size-3.5 text-emerald-600" /> 3. Các bước sơ cấp cứu & Vật tư đã can thiệp tại chỗ
            </h3>
            <div className="space-y-2 rounded-md border p-3 text-xs">
              <div>
                <span className="text-slate-500">Biện pháp sơ cứu đã thực hiện: </span>
                <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                  {incident.handlingActions || "Đã kiểm tra sinh tồn, cố định sơ bộ và liên hệ kíp vận chuyển cấp cứu."}
                </p>
              </div>

              {/* Danh sách vật tư (F-14 / D2) */}
              <div className="mt-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Danh mục thuốc & vật tư y tế đã dùng:
                </span>
                {supplies.length === 0 ? (
                  <p className="mt-1 text-[11px] text-slate-400 italic">Không sử dụng vật tư y tế tiêu hao.</p>
                ) : (
                  <table className="mt-1.5 w-full border text-left text-[11px]">
                    <thead className="border-b bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="p-1.5">Tên vật tư</th>
                        <th className="p-1.5">Số lượng</th>
                        <th className="p-1.5">Đơn vị</th>
                        <th className="p-1.5 text-right">Chi phí phụ thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supplies.map((s) => (
                        <tr key={s.supplyTransactionId}>
                          <td className="p-1.5 font-medium">{s.supplyName}</td>
                          <td className="p-1.5 font-semibold">{s.quantity}</td>
                          <td className="p-1.5">{s.unit}</td>
                          <td className="p-1.5 text-right tabular-nums">{money(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t font-semibold">
                      <tr>
                        <td colSpan={3} className="p-1.5 text-right">Tổng phụ thu vật tư:</td>
                        <td className="p-1.5 text-right text-emerald-700 dark:text-emerald-400">
                          {money(incident.supplyChargeAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* 4. Thông tin điều chuyển viện */}
          <div className="mt-4 space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase text-sky-900 dark:text-sky-300">
              <Building2 className="size-3.5 text-indigo-600" /> 4. Thông tin cơ sở tiếp nhận & Nhân sự áp tải
            </h3>
            <div className="grid grid-cols-1 gap-2 rounded-md bg-rose-50/70 p-3 text-xs sm:grid-cols-3 dark:bg-rose-950/30">
              <div>
                <span className="text-slate-500">Bệnh viện tiếp nhận: </span>
                <p className="font-bold text-rose-800 dark:text-rose-300">
                  {incident.hospitalName || "Chưa ghi nhận tên bệnh viện"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Thời điểm xe lăn bánh: </span>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {incident.hospitalTransferAt ? formatDateTimeVN(incident.hospitalTransferAt) : "Đang chuẩn bị điều chuyển"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Nhân viên y tế áp tải: </span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {incident.hospitalEscort || incident.handledByName || "Điều dưỡng trực ca"}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Chữ ký xác nhận bàn giao (3 bên) */}
          <div className="mt-8 grid grid-cols-3 gap-4 pt-4 text-center text-xs">
            <div>
              <p className="font-bold uppercase">NGƯỜI BÁO CÁO / SƠ CỨU</p>
              <p className="text-[11px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold">{incident.reportedByName}</p>
            </div>
            <div>
              <p className="font-bold uppercase">ĐẠI DIỆN TRUNG TÂM</p>
              <p className="text-[11px] text-slate-400 italic">(Quản lý ca trực xác nhận)</p>
              <div className="h-14"></div>
              <p className="font-semibold">{incident.handledByName || "Quản lý chuyên môn"}</p>
            </div>
            <div>
              <p className="font-bold uppercase">BỆNH VIỆN TIẾP NHẬN</p>
              <p className="text-[11px] text-slate-400 italic">(Bác sĩ / Kíp nhận cấp cứu)</p>
              <div className="h-14"></div>
              <p className="font-semibold">........................................</p>
            </div>
          </div>
        </div>

        {/* Footer Thao tác (ẩn khi in) */}
        <DialogFooter className="mt-4 flex items-center justify-between gap-2 border-t pt-3 print:hidden">
          <p className="text-xs text-muted-foreground">
            Khuyến nghị: In 02 bản (01 bản lưu hồ sơ bệnh án trung tâm, 01 bản giao kíp xe cấp cứu).
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button onClick={handlePrint} className="gap-2 bg-sky-700 hover:bg-sky-800 text-white">
              <Printer className="size-4" /> In phiếu bàn giao
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmergencyTransferSlipModal;
