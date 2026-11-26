import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  Receipt,
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
import incidentReportService from "../../services/incidentReportService";
import type { IncidentReport, IncidentSupplyUsage } from "../../services/incidentReportService";
import type { FamilyIncident } from "../../services/familyCareLogService";
import { formatDateTimeVN } from "../../lib/date";

interface Props {
  incident: FamilyIncident | null;
  open: boolean;
  onClose: () => void;
}

const money = (n: number) => `${(n || 0).toLocaleString("vi-VN")} đ`;

const severityLabels: Record<string, string> = {
  Low: "Nhẹ",
  Medium: "Trung bình",
  High: "Nặng",
  Critical: "Nghiêm trọng",
};

const statusLabels: Record<string, string> = {
  Open: "Mới ghi nhận",
  InProgress: "Đang can thiệp xử lý",
  Resolved: "Đã xử lý xong",
};

export function FamilyIncidentDetailModal({ incident, open, onClose }: Props) {
  const [supplies, setSupplies] = useState<IncidentSupplyUsage[]>([]);
  const [reportDetail, setReportDetail] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!incident || !open) return;
    setLoading(true);
    setActivePhoto(null);

    Promise.all([
      incidentReportService.getSupplies(incident.incidentId).catch(() => ({ data: [] })),
      incidentReportService.get(incident.incidentId).catch(() => ({ data: null })),
    ])
      .then(([supRes, repRes]) => {
        setSupplies(supRes.data ?? []);
        if (repRes.data) setReportDetail(repRes.data);
      })
      .finally(() => setLoading(false));
  }, [incident, open]);

  if (!incident) return null;

  const photos = reportDetail?.photoUrls ?? [];
  const totalSupplyAmount = supplies.reduce((sum, s) => sum + s.amount, 0) || (incident.supplyChargeAmount ?? 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="size-5" />
              <DialogTitle className="text-base sm:text-lg">
                Chi tiết sự cố y tế & Bảng kê phụ phí vật tư
              </DialogTitle>
            </div>
            <Badge variant={incident.severity === "Critical" || incident.severity === "High" ? "destructive" : "secondary"}>
              Mức độ: {severityLabels[incident.severity] ?? incident.severity}
            </Badge>
          </div>
          <DialogDescription>
            Hồ sơ can thiệp và minh bạch chi phí vật tư sơ cứu cho người cao tuổi {incident.elderlyName} (F-14 / D2).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto size-6 animate-spin text-rose-600" />
            <p className="mt-2 text-xs">Đang tải thông tin chi tiết...</p>
          </div>
        ) : (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Tóm tắt sự việc */}
            <div className="rounded-lg border bg-rose-50/50 p-3.5 space-y-2 dark:bg-rose-950/20 dark:border-rose-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-rose-950 dark:text-rose-200">
                  {incident.incidentType}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-200">
                  {statusLabels[incident.status] ?? incident.status}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                {incident.description}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-[11px] pt-1 border-t border-rose-100 dark:border-rose-900/40">
                <span>Xảy ra: {formatDateTimeVN(incident.occurredAt)}</span>
                <span>Báo lúc: {formatDateTimeVN(incident.reportedAt)}</span>
                {incident.reportedByName && <span>Ghi nhận bởi: {incident.reportedByName}</span>}
              </div>
            </div>

            {/* Can thiệp sơ cứu & Xử lý */}
            <div className="rounded-lg border p-3.5 space-y-2">
              <h4 className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Clock className="size-4 text-sky-600" /> Biện pháp can thiệp sơ cấp cứu tại trung tâm
              </h4>
              <p className="text-slate-700 dark:text-slate-300">
                {incident.handlingActions || reportDetail?.handlingActions || "Đã sơ cứu, theo dõi chỉ số sinh tồn và chăm sóc tại chỗ."}
              </p>
              {incident.resolutionNotes && (
                <div className="rounded-md bg-slate-50 p-2.5 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Kết quả xử lý: </span>
                  {incident.resolutionNotes}
                </div>
              )}
            </div>

            {/* Thông tin chuyển viện (nếu có) */}
            {incident.hospitalName && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3.5 space-y-2 dark:bg-indigo-950/20 dark:border-indigo-900/50">
                <h4 className="flex items-center gap-1.5 font-semibold text-indigo-950 dark:text-indigo-200">
                  <Building2 className="size-4 text-indigo-600" /> Điều chuyển cấp cứu bệnh viện
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-slate-500">Bệnh viện tiếp nhận: </span>
                    <span className="font-semibold text-indigo-900 dark:text-indigo-300">{incident.hospitalName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Thời điểm chuyển: </span>
                    <span>
                      {incident.hospitalTransferAt
                        ? formatDateTimeVN(incident.hospitalTransferAt)
                        : "Đang điều chuyển"}
                    </span>
                  </div>
                  {reportDetail?.hospitalEscort && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Nhân viên hộ tống: </span>
                      <span className="font-medium">{reportDetail.hospitalEscort}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BẢNG KÊ PHỤ PHÍ VẬT TƯ Y TẾ SƠ CỨU (F-14 / D2) */}
            <div className="rounded-lg border p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-400">
                  <Receipt className="size-4" /> Bảng kê vật tư y tế đã sử dụng (Phụ phí tính riêng)
                </h4>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Tổng: {money(totalSupplyAmount)}
                </span>
              </div>

              {supplies.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {(incident.supplyChargeAmount ?? 0) > 0
                    ? `Phụ phí vật tư sơ cứu ghi nhận: ${money(incident.supplyChargeAmount ?? 0)} (Liên hệ trung tâm để lấy phiếu chi tiết).`
                    : "Không phát sinh phụ phí vật tư tiêu hao trong ca sự cố này."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border text-left text-xs">
                    <thead className="border-b bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="p-2">Vật tư y tế</th>
                        <th className="p-2 text-right">Số lượng</th>
                        <th className="p-2">Đơn vị</th>
                        <th className="p-2 text-right">Đơn giá</th>
                        <th className="p-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {supplies.map((s) => (
                        <tr key={s.supplyTransactionId}>
                          <td className="p-2 font-medium">{s.supplyName}</td>
                          <td className="p-2 text-right tabular-nums">{s.quantity}</td>
                          <td className="p-2">{s.unit}</td>
                          <td className="p-2 text-right tabular-nums text-slate-500">{money(s.unitPrice)}</td>
                          <td className="p-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                            {money(s.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-slate-50/50 font-semibold dark:bg-slate-900/50">
                      <tr>
                        <td colSpan={4} className="p-2 text-right">
                          Tổng cộng chi phí vật tư:
                        </td>
                        <td className="p-2 text-right text-emerald-700 dark:text-emerald-400">
                          {money(totalSupplyAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground leading-normal">
                * Lưu ý: Theo quyết định phân loại chi phí dịch vụ (D2 / F-14), các loại vật tư sơ cấp cứu (băng gạc vô trùng, thuốc sát khuẩn, nẹp cố định...) được tính riêng theo thực tế sử dụng để đảm bảo tính minh bạch và chất lượng chăm sóc tốt nhất cho người cao tuổi.
              </p>
            </div>

            {/* Thư viện ảnh hiện trường sự cố */}
            {photos.length > 0 && (
              <div className="rounded-lg border p-3.5 space-y-2">
                <h4 className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                  <ImageIcon className="size-4 text-purple-600" /> Ảnh hiện trường & tổn thương ({photos.length})
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {photos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhoto(url)}
                      className="group relative size-16 overflow-hidden rounded-md border hover:ring-2 hover:ring-sky-500 focus:outline-hidden"
                    >
                      <img src={url} alt={`Ảnh sự cố ${idx + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Xem ảnh phóng to */}
            {activePhoto && (
              <div className="relative rounded-lg border bg-black p-2">
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="absolute top-3 right-3 rounded-full bg-slate-800/80 p-1 text-white hover:bg-slate-700"
                >
                  <X className="size-4" />
                </button>
                <img src={activePhoto} alt="Ảnh phóng to" className="mx-auto max-h-72 rounded object-contain" />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-2 border-t pt-2">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FamilyIncidentDetailModal;
