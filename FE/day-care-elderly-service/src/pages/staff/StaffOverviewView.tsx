import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Bell, CheckCircle2, Loader2, Pill, RefreshCw, Users } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatCard from "../../components/StatCard";
import overviewService, { MEMBER_STATUS_LABEL } from "../../services/overviewService";
import type { MemberStatus, StaffOverview } from "../../services/overviewService";
import { formatDateVN } from "../../lib/date";

const STATUS_VARIANT: Record<MemberStatus, "secondary" | "outline" | "ghost" | "destructive"> = {
  Present: "secondary",
  Left: "outline",
  NotArrived: "ghost",
  Absent: "destructive",
};
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—");

/** Tổng quan ca trực: nhóm phụ trách, tiến độ care log, thuốc sắp tới (BR-33: chỉ cụ được phân) */
export function StaffOverviewView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<StaffOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await overviewService.staffOverview();
      if (res.data) setData(res.data);
    } catch {
      toast.error("Không tải được tổng quan ca trực.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!data) return <p className="py-10 text-center text-sm text-muted-foreground">{loading ? "Đang tải..." : "Chưa có dữ liệu."}</p>;

  const present = data.members.filter((m) => m.status === "Present").length;
  const closed = data.members.filter((m) => m.closed).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ca trực hôm nay</CardTitle>
          <CardDescription>
            {formatDateVN(data.date)} ·{" "}
            {data.group ? (
              <>Nhóm <b>{data.group.groupName}</b> ({data.group.groupType === "Support" ? "cần hỗ trợ" : "bình thường"})</>
            ) : data.hasPublishedPlan ? (
              "Bạn chưa được phân nhóm hôm nay"
            ) : (
              "Hôm nay chưa có kế hoạch được công bố"
            )}
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="icon" onClick={load} title="Tải lại">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cụ phụ trách" value={data.members.length} hint={`${present} đang có mặt`} icon={Users} />
        <StatCard label="Care log đã chốt" value={`${closed}/${data.members.length}`} icon={CheckCircle2} tone={closed === data.members.length && closed > 0 ? "good" : "default"} />
        <StatCard label="Thuốc chờ cho uống" value={data.doses.pending} hint={data.doses.overdue > 0 ? `${data.doses.overdue} liều quá giờ` : "Không có liều quá giờ"} icon={Pill} tone={data.doses.overdue > 0 ? "bad" : "good"} />
        <StatCard label="Sự cố đang mở" value={data.openIncidents} hint={`${data.unreadNotifications} thông báo chưa đọc`} icon={data.openIncidents > 0 ? AlertTriangle : Bell} tone={data.openIncidents > 0 ? "warn" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="sm" className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Cụ trong nhóm</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Đến / về</TableHead>
                  <TableHead>Tiến độ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.members.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Chưa có cụ nào được phân.</TableCell></TableRow>
                ) : (
                  data.members.map((m) => (
                    <TableRow key={m.elderlyId}>
                      <TableCell>
                        <p className="font-medium">{m.fullName}</p>
                        {m.allergies && <p className="text-xs text-amber-700">Dị ứng: {m.allergies}</p>}
                      </TableCell>
                      <TableCell><Badge variant={STATUS_VARIANT[m.status]}>{MEMBER_STATUS_LABEL[m.status]}</Badge></TableCell>
                      <TableCell className="text-xs tabular-nums">{time(m.checkInAt)} → {time(m.checkOutAt)}</TableCell>
                      <TableCell className="space-x-1 text-xs">
                        <span>{m.entries} ghi nhận</span>
                        {m.hasVitals && <Badge variant="outline">Chỉ số</Badge>}
                        {m.medicalDone && <Badge variant="secondary">Y tế xong</Badge>}
                        {m.closed && <Badge>Đã chốt</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {onNavigate && <Button variant="link" className="h-auto p-0 pt-2" onClick={() => onNavigate("carelog")}>Mở Carelog →</Button>}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader><CardTitle className="text-sm">Liều thuốc sắp tới</CardTitle></CardHeader>
          <CardContent>
            {data.doses.next.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không còn liều chờ.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.doses.next.map((d) => {
                  const late = new Date(d.scheduledAt).getTime() < Date.now() - 30 * 60000;
                  return (
                    <li key={d.medicationRecordId} className="flex items-start justify-between gap-2">
                      <span>
                        <span className="font-medium">{d.medicationName}</span>
                        <span className="block text-xs text-muted-foreground">{d.elderlyName}</span>
                      </span>
                      <Badge variant={late ? "destructive" : "outline"}>{time(d.scheduledAt)}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StaffOverviewView;
