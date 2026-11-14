import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarCheck, ClipboardCheck, FileText, Loader2, Package, Pill, RefreshCw, UserCheck, Users,
} from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatCard, { RatioBar } from "../../components/StatCard";
import overviewService from "../../services/overviewService";
import type { CenterDashboard } from "../../services/overviewService";
import { formatDateVN } from "../../lib/date";

const PLAN_STATUS: Record<string, string> = {
  Draft: "Bản nháp",
  ReadyToReview: "Chờ duyệt",
  Confirmed: "Đã xác nhận",
  Published: "Đã công bố",
};
const SEVERITY: Record<string, string> = { Low: "Thấp", Medium: "Trung bình", High: "Cao", Critical: "Nghiêm trọng" };

/** F-15: tổng quan vận hành trong ngày cho Quản lý trung tâm */
export function CenterOverviewView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<CenterDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await overviewService.centerDashboard();
      if (res.data) setData(res.data);
    } catch {
      toast.error("Không tải được tổng quan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{loading ? "Đang tải..." : "Chưa có dữ liệu."}</p>;
  }
  const a = data.attendance;
  const m = data.medication;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tổng quan hôm nay</CardTitle>
          <CardDescription>
            {formatDateVN(data.date)} · Kế hoạch hôm nay:{" "}
            <Badge variant={data.plan ? "secondary" : "destructive"}>{data.plan ? PLAN_STATUS[data.plan.status] ?? data.plan.status : "Chưa lập"}</Badge>{" "}
            · Ngày làm việc kế tiếp ({formatDateVN(data.nextPlan.date)}): <Badge variant="outline">{PLAN_STATUS[data.nextPlan.status] ?? data.nextPlan.status}</Badge>
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="icon" onClick={load} title="Tải lại">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dự kiến đến" value={a.expected} hint={`${a.absenceReported} báo vắng`} icon={Users} />
        <StatCard label="Đang có mặt" value={a.present} hint={`${a.checkedIn} đã đến · ${a.left} đã về`} icon={UserCheck} tone="good" />
        <StatCard
          label="Liều thuốc hôm nay"
          value={`${m.given}/${m.total}`}
          hint={`${m.pending} chờ · ${m.refused} từ chối · ${m.missed} bỏ lỡ`}
          icon={Pill}
          tone={m.overdue > 0 ? "bad" : "good"}
        />
        <StatCard
          label="Sự cố đang mở"
          value={data.incidents.open}
          hint={`${data.incidents.today} sự cố phát sinh hôm nay`}
          icon={AlertTriangle}
          tone={data.incidents.open > 0 ? "warn" : "good"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><ClipboardCheck className="size-4" /> Điểm danh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Đã đến / dự kiến</span><span className="tabular-nums">{a.checkedIn}/{a.expected}</span></div>
            <RatioBar value={a.checkedIn} max={Math.max(a.expected, a.checkedIn)} />
            <div className="flex justify-between pt-2"><span>Care log đã chốt</span><span className="tabular-nums">{data.careLogs.closed}/{a.checkedIn}</span></div>
            <RatioBar value={data.careLogs.closed} max={a.checkedIn} className="bg-slate-700" />
            <p className="text-xs text-muted-foreground">{data.careLogs.entries} ghi nhận care log hôm nay</p>
            {onNavigate && <Button variant="link" className="h-auto p-0" onClick={() => onNavigate("attendance")}>Xem điểm danh →</Button>}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Pill className="size-4" /> Thuốc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Đã cho uống</span><span className="tabular-nums">{m.given}/{m.total}</span></div>
            <RatioBar value={m.given} max={m.total} />
            {m.overdue > 0 ? (
              <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">{m.overdue} liều quá giờ hơn 30 phút chưa ghi nhận</p>
            ) : (
              <p className="text-xs text-muted-foreground">Không có liều quá giờ.</p>
            )}
            <div className="pt-1">
              <p className="mb-1 text-xs font-medium">Sự cố mở theo mức độ</p>
              <div className="flex flex-wrap gap-1">
                {data.incidents.openBySeverity.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Không có</span>
                ) : (
                  data.incidents.openBySeverity.map((s) => (
                    <Badge key={s.severity} variant={s.severity === "Critical" || s.severity === "High" ? "destructive" : "outline"}>
                      {SEVERITY[s.severity] ?? s.severity}: {s.count}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Package className="size-4" /> Vật tư & việc cần làm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.supplies.lowStock.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có vật tư sắp hết.</p>
            ) : (
              <ul className="space-y-1">
                {data.supplies.lowStock.slice(0, 5).map((s) => (
                  <li key={s.supplyId} className="flex justify-between text-xs">
                    <span>{s.supplyName}</span>
                    <span className="font-semibold text-rose-600 tabular-nums">{s.quantityInStock}/{s.minimumStock} {s.unit}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.supplies.expiringIn30Days > 0 && (
              <p className="text-xs text-amber-700">{data.supplies.expiringIn30Days} vật tư hết hạn trong 30 ngày</p>
            )}
            <div className="flex items-center justify-between border-t pt-2">
              <span className="flex items-center gap-1"><FileText className="size-3.5" /> Đơn nghỉ / đổi ca chờ duyệt</span>
              <Badge variant={data.pendingStaffRequests > 0 ? "destructive" : "outline"}>{data.pendingStaffRequests}</Badge>
            </div>
            {onNavigate && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => onNavigate("daily-planning")}><CalendarCheck /> Lập kế hoạch</Button>
                <Button variant="outline" size="sm" onClick={() => onNavigate("staff-requests")}>Duyệt đơn</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CenterOverviewView;
