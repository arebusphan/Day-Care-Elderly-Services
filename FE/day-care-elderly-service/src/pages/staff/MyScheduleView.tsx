import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import staffRequestService, { REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "../../services/staffRequestService";
import type { MyScheduleDay, StaffRequest, StaffRequestType } from "../../services/staffRequestService";
import { formatDateVN, nextWorkingDay } from "../../lib/date";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const AVAIL: Record<MyScheduleDay["availability"], { label: string; v: "secondary" | "destructive" | "outline" | "ghost" }> = {
  Working: { label: "Đi làm", v: "secondary" },
  Off: { label: "Nghỉ", v: "outline" },
  Leave: { label: "Nghỉ phép", v: "destructive" },
  Closed: { label: "Trung tâm nghỉ", v: "ghost" },
};
const typeItems = [
  { value: "Leave", label: "Xin nghỉ" },
  { value: "ShiftChange", label: "Đổi ca (có người làm thay)" },
];

/** SRS 3.10.2: Lịch của tôi + gửi đơn nghỉ / đổi ca */
export function MyScheduleView() {
  const [days, setDays] = useState<MyScheduleDay[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [colleagues, setColleagues] = useState<{ userId: number; fullName: string }[]>([]);
  const [type, setType] = useState<StaffRequestType>("Leave");
  const [date, setDate] = useState(nextWorkingDay());
  const [swap, setSwap] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([staffRequestService.mySchedule(14), staffRequestService.mine()]);
      setDays(s.data ?? []);
      setRequests(r.data ?? []);
    } catch (err) {
      toast.error(errMsg(err, "Không tải được lịch."));
    }
  }, []);

  useEffect(() => {
    load();
    staffRequestService.colleagues().then((r) => setColleagues(r.data ?? [])).catch(() => setColleagues([]));
  }, [load]);

  const colleagueItems = useMemo(() => colleagues.map((c) => ({ value: String(c.userId), label: c.fullName })), [colleagues]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "ShiftChange" && !swap) return toast.error("Chọn đồng nghiệp làm thay.");
    setSending(true);
    try {
      const res = await staffRequestService.create({ requestType: type, requestDate: date, swapWithStaffId: type === "ShiftChange" ? Number(swap) : null, reason: reason.trim() || undefined });
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      setReason("");
      load();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không gửi được đơn."));
    } finally {
      setSending(false);
    }
  };

  const cancel = async (r: StaffRequest) => {
    try {
      await staffRequestService.cancel(r.requestId);
      toast.success("Đã hủy đơn.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Không hủy được."));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><CalendarDays className="size-4 text-emerald-600" /> Lịch của tôi (14 ngày tới)</CardTitle>
          <CardDescription>Theo lịch làm việc quản lý đặt và kế hoạch ngày đã lập.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Ngày</TableHead><TableHead>Trạng thái</TableHead><TableHead>Nhóm phụ trách</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.date} className={d.isSunday ? "text-muted-foreground" : ""}>
                  <TableCell className="text-xs">{formatDateVN(d.date)}</TableCell>
                  <TableCell>
                    <Badge variant={AVAIL[d.availability].v}>{AVAIL[d.availability].label}</Badge>
                    {d.requests.some((x) => x.endsWith(":Pending")) && <Badge variant="outline" className="ml-1">Đơn chờ duyệt</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {d.group ? `${d.group.groupName} · ${d.group.members} cụ (${d.group.groupType === "Support" ? "cần hỗ trợ" : "bình thường"})` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card size="sm">
          <CardHeader><CardTitle className="text-sm">Gửi đơn</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3">
              <div className="space-y-1.5">
                <Label>Loại đơn</Label>
                <Select items={typeItems} value={type} onValueChange={(v) => setType(v as StaffRequestType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{typeItems.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req-date">Ngày</Label>
                <Input id="req-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              {type === "ShiftChange" && (
                <div className="space-y-1.5">
                  <Label>Người làm thay</Label>
                  <Select items={colleagueItems} value={swap} onValueChange={(v) => setSwap(v as string | null)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Chọn đồng nghiệp" /></SelectTrigger>
                    <SelectContent>{colleagueItems.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="req-reason">Lý do</Label>
                <Input id="req-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button type="submit" disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />}Gửi đơn</Button>
            </form>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader><CardTitle className="text-sm">Đơn của tôi</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có đơn nào.</p>
            ) : (
              <ul className="divide-y text-sm">
                {requests.map((r) => (
                  <li key={r.requestId} className="flex items-start justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium">{REQUEST_TYPE_LABEL[r.requestType]}</span> · {formatDateVN(r.requestDate)}
                      {r.swapWithStaffName && <span className="block text-xs text-muted-foreground">Làm thay: {r.swapWithStaffName}</span>}
                      {r.reviewNote && <span className="block text-xs text-muted-foreground">Ghi chú: {r.reviewNote}</span>}
                    </span>
                    <span className="flex items-center gap-1">
                      <Badge variant={r.status === "Approved" ? "secondary" : r.status === "Rejected" ? "destructive" : "outline"}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                      {r.status === "Pending" && <Button variant="ghost" size="xs" onClick={() => cancel(r)}>Hủy</Button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MyScheduleView;
