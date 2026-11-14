import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, HeartPulse, Loader2, Package, Pill, RefreshCw } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import overviewService, { MEMBER_STATUS_LABEL } from "../../services/overviewService";
import type { FamilyOverview, MemberStatus } from "../../services/overviewService";
import { formatDateVN } from "../../lib/date";

const STATUS_VARIANT: Record<MemberStatus, "secondary" | "outline" | "ghost" | "destructive"> = {
  Present: "secondary",
  Left: "outline",
  NotArrived: "ghost",
  Absent: "destructive",
};
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—");

/** "Hôm nay của người thân": trạng thái, hoạt động mới nhất, chỉ số, thuốc, sự cố, gói */
export function FamilyOverviewView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await overviewService.familyOverview();
      if (res.data) setData(res.data);
    } catch {
      toast.error("Không tải được tổng quan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!data) return <p className="py-10 text-center text-sm text-muted-foreground">{loading ? "Đang tải..." : "Chưa có dữ liệu."}</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hôm nay của người thân</CardTitle>
          <CardDescription>
            {formatDateVN(data.date)} · {data.unreadNotifications} thông báo chưa đọc · tự cập nhật mỗi phút
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="icon" onClick={load} title="Tải lại">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {data.members.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Bạn chưa có hồ sơ người thân nào.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.members.map((m) => (
            <Card key={m.elderlyId} size="sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {m.fullName}
                  <Badge variant={STATUS_VARIANT[m.status]}>{MEMBER_STATUS_LABEL[m.status]}</Badge>
                </CardTitle>
                <CardDescription>
                  Đến {time(m.checkInAt)} · Về {time(m.checkOutAt)}
                  {m.pickupName && ` · Người đón: ${m.pickupName}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Activity className="mt-0.5 size-4 text-emerald-600" />
                  <div>
                    <p className="font-medium">{m.entriesToday} hoạt động được ghi nhận hôm nay</p>
                    {m.latestActivity && (
                      <p className="text-xs text-muted-foreground">
                        Mới nhất {time(m.latestActivity.recordedAt)}: {m.latestActivity.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <HeartPulse className="mt-0.5 size-4 text-rose-500" />
                  <p>
                    {m.latestVitals ? (
                      <>
                        Chỉ số lúc {time(m.latestVitals.recordedAt)}
                        {m.latestVitals.bloodPressure && <> · HA <b>{m.latestVitals.bloodPressure}</b></>}
                        {m.latestVitals.bloodGlucose != null && <> · Đường huyết <b>{m.latestVitals.bloodGlucose}</b></>}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Chưa đo chỉ số hôm nay</span>
                    )}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Pill className="mt-0.5 size-4 text-sky-600" />
                  <p>Thuốc: {m.doses.given}/{m.doses.total} liều đã uống{m.doses.pending > 0 && ` · ${m.doses.pending} liều chờ`}</p>
                </div>
                {m.openIncidents.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-rose-50 p-2 text-rose-800">
                    <AlertTriangle className="mt-0.5 size-4" />
                    <p>{m.openIncidents.length} sự cố đang xử lý: {m.openIncidents.map((i) => i.incidentType).join(", ")}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Package className="mt-0.5 size-4 text-slate-500" />
                  <p className="text-xs">
                    {m.packages.length === 0
                      ? "Chưa có gói đang hoạt động"
                      : m.packages.map((p) => `${p.packageName}${p.endDate ? ` (đến ${new Date(p.endDate + "T00:00:00").toLocaleDateString("vi-VN")})` : ""}`).join("; ")}
                    {m.upcomingAbsences.length > 0 && ` · Báo vắng: ${m.upcomingAbsences.map((d) => d.slice(8, 10) + "/" + d.slice(5, 7)).join(", ")}`}
                  </p>
                </div>
                {onNavigate && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => onNavigate("health_tracking")}>Xem nhật ký & sức khỏe</Button>
                    <Button variant="outline" size="sm" onClick={() => onNavigate("attendence")}>Điểm danh / báo vắng</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default FamilyOverviewView;
