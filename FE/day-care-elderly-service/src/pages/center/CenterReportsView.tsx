import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BarChart3, Loader2 } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatCard, { RatioBar } from "../../components/StatCard";
import overviewService from "../../services/overviewService";
import type { CenterReport } from "../../services/overviewService";
import { localToday } from "../../lib/date";

const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const SEVERITY: Record<string, string> = { Low: "Thấp", Medium: "Trung bình", High: "Cao", Critical: "Nghiêm trọng" };

/** F-15: báo cáo vận hành theo khoảng ngày (điểm danh, sự cố, thuốc, doanh thu, vật tư, nhân sự) */
export function CenterReportsView() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(localToday());
  const [data, setData] = useState<CenterReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await overviewService.centerReport(from, to);
      if (res.data) setData(res.data);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không tải được báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxDay = Math.max(1, ...(data?.attendance.byDay.map((d) => d.count) ?? [1]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-sky-600" /> Báo cáo vận hành</CardTitle>
          <CardDescription>Chọn khoảng ngày rồi bấm Xem báo cáo.</CardDescription>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Input type="date" className="w-40" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-muted-foreground">→</span>
            <Input type="date" className="w-40" value={to} min={from} max={localToday()} onChange={(e) => setTo(e.target.value)} />
            <Button onClick={load} disabled={loading}>{loading && <Loader2 className="animate-spin" />}Xem báo cáo</Button>
          </CardAction>
        </CardHeader>
      </Card>

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Lượt đến trung tâm" value={data.attendance.totalVisits} hint={`TB ${data.attendance.averagePerDay}/ngày`} />
            <StatCard label="Tỉ lệ cho uống thuốc" value={`${data.medication.complianceRate}%`} hint={`${data.medication.given}/${data.medication.due} liều`} tone={data.medication.complianceRate >= 90 ? "good" : "warn"} />
            <StatCard label="Sự cố" value={data.incidents.total} hint={`${data.incidents.resolved} đã xử lý · phí vật tư ${money(data.incidents.supplyCharges)}`} />
            <StatCard label="Doanh thu đã thu" value={money(data.revenue.paidAmount)} hint={`${data.revenue.newRegistrations} đăng ký mới`} tone="good" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader><CardTitle className="text-sm">Lượt đến theo ngày</CardTitle></CardHeader>
              <CardContent>
                {data.attendance.byDay.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Không có dữ liệu.</p>
                ) : (
                  <div className="flex h-40 items-end gap-1">
                    {data.attendance.byDay.map((d) => (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{d.count}</span>
                        <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(d.count / maxDay) * 120}px` }} />
                        <span className="text-[10px] text-muted-foreground">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader><CardTitle className="text-sm">Thuốc & sự cố</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {([
                  ["Đã cho uống", data.medication.given, "bg-emerald-500"],
                  ["Từ chối", data.medication.refused, "bg-amber-500"],
                  ["Bỏ lỡ", data.medication.missed, "bg-rose-500"],
                  ["Chưa ghi nhận", data.medication.notRecorded, "bg-slate-400"],
                ] as const).map(([label, v, cls]) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs"><span>{label}</span><span className="tabular-nums">{v}</span></div>
                    <RatioBar value={v} max={data.medication.due} className={cls} />
                  </div>
                ))}
                <div className="border-t pt-2">
                  <p className="mb-1 text-xs font-medium">Sự cố theo mức độ</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {data.incidents.bySeverity.map((s) => <span key={s.severity}>{SEVERITY[s.severity] ?? s.severity}: <b>{s.count}</b></span>)}
                  </div>
                  <p className="mb-1 mt-2 text-xs font-medium">Loại sự cố nhiều nhất</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {data.incidents.byType.map((t) => <span key={t.type}>{t.type}: <b>{t.count}</b></span>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card size="sm">
              <CardHeader><CardTitle className="text-sm">Vật tư tiêu hao nhiều nhất</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Vật tư</TableHead><TableHead className="text-right">Đã dùng</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.supplyUsage.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Không có</TableCell></TableRow>
                    ) : data.supplyUsage.map((s) => (
                      <TableRow key={s.supplyId}><TableCell>{s.supplyName}</TableCell><TableCell className="text-right tabular-nums">{s.quantity} {s.unit}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader><CardTitle className="text-sm">Khối lượng công việc nhân viên</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Nhân viên</TableHead><TableHead className="text-right">Ngày làm</TableHead><TableHead className="text-right">Lượt phụ trách</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.staffWorkload.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Không có</TableCell></TableRow>
                    ) : data.staffWorkload.map((s) => (
                      <TableRow key={s.staffId}><TableCell>{s.fullName}</TableCell><TableCell className="text-right tabular-nums">{s.days}</TableCell><TableCell className="text-right tabular-nums">{s.assignments}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default CenterReportsView;
