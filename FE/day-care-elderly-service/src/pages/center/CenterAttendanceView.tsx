import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, History, Loader2, RefreshCw, Search } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import attendanceService from "../../services/attendanceService";
import type { AttendanceItem } from "../../services/attendanceService";
import { formatDateVN, localToday } from "../../lib/date";

/** SRS 3.6.3: Manager xem điểm danh của mọi cụ theo ngày (chỉ xem — check-in/out do Staff làm). */
type View = "all" | "present" | "left";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

const isPresent = (a: AttendanceItem) => !!a.checkInAt && !a.checkOutAt;

export function CenterAttendanceView() {
  const [date, setDate] = useState(localToday());
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");

  const [historyOf, setHistoryOf] = useState<AttendanceItem | null>(null);
  const [history, setHistory] = useState<AttendanceItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = async (d = date) => {
    setLoading(true);
    try {
      setItems(await attendanceService.getByDate(d));
    } catch (err) {
      setItems([]);
      toast.error(errMsg(err, "Không tải được điểm danh."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openHistory = async (a: AttendanceItem) => {
    setHistoryOf(a);
    setHistory([]);
    setLoadingHistory(true);
    try {
      setHistory(await attendanceService.getHistory(a.elderlyId));
    } catch (err) {
      toast.error(errMsg(err, "Không tải được lịch sử điểm danh."));
    } finally {
      setLoadingHistory(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      present: items.filter(isPresent).length,
      left: items.filter((a) => !!a.checkOutAt).length,
    }),
    [items],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((a) => (view === "present" ? isPresent(a) : view === "left" ? !!a.checkOutAt : true))
      .filter((a) => !term || a.elderlyName.toLowerCase().includes(term));
  }, [items, view, search]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-emerald-600" /> Điểm danh người cao tuổi
          </CardTitle>
          <CardDescription>
            {formatDateVN(date)} · {stats.total} lượt đến · {stats.present} đang có mặt · {stats.left} đã về
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            <Input type="date" className="w-40" value={date} max={localToday()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            <Button variant="outline" size="icon" title="Tải lại" onClick={() => load()}>
              <RefreshCw />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
                <TabsTrigger value="present">Đang có mặt ({stats.present})</TabsTrigger>
                <TabsTrigger value="left">Đã về ({stats.left})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8" placeholder="Tìm theo tên..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người cao tuổi</TableHead>
                <TableHead>Giờ đến</TableHead>
                <TableHead>Giờ về</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Lịch sử</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Không có lượt điểm danh nào.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.attendanceId}>
                    <TableCell className="font-medium">{a.elderlyName}</TableCell>
                    <TableCell className="tabular-nums">{timeOf(a.checkInAt)}</TableCell>
                    <TableCell className="tabular-nums">{timeOf(a.checkOutAt)}</TableCell>
                    <TableCell>
                      {isPresent(a) ? (
                        <Badge variant="secondary">Đang có mặt</Badge>
                      ) : a.checkOutAt ? (
                        <Badge variant="outline">Đã về</Badge>
                      ) : (
                        <Badge variant="ghost">{a.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Lịch sử điểm danh" onClick={() => openHistory(a)}>
                        <History />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground">Chỉ xem. Check-in / check-out do nhân viên chăm sóc thực hiện.</p>
        </CardContent>
      </Card>

      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lịch sử điểm danh</DialogTitle>
            <DialogDescription>{historyOf?.elderlyName}</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            {loadingHistory ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Đang tải...</p>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Chưa có lịch sử.</p>
            ) : (
              <ul className="divide-y text-sm">
                {history.map((h) => (
                  <li key={h.attendanceId} className="flex items-center justify-between px-3 py-2">
                    <span>{formatDateVN(h.attendanceDate)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {timeOf(h.checkInAt)} → {timeOf(h.checkOutAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CenterAttendanceView;
