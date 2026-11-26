import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, Loader2, Pill, RefreshCw, Search } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import medicationService from "../../services/medicationService";
import type { DoseHistoryItem } from "../../services/medicationService";
import { formatDateVN, localToday } from "../../lib/date";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

type StatusView = "all" | "Pending" | "Given" | "Refused" | "Missed";

const statusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s === "given") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "refused") return "bg-rose-50 text-rose-700 border-rose-200";
  if (s === "missed") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const timeOf = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/** Lịch sử cho uống = MedicationRecords (Hướng A, không bảng mới). Dùng cho Staff/Admin. */
export function MedicationDoseHistoryView() {
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(localToday());
  const [status, setStatus] = useState<StatusView>("all");
  const [search, setSearch] = useState("");
  const [elderlyId, setElderlyId] = useState<string>("");
  const [items, setItems] = useState<DoseHistoryItem[]>([]);
  const [elderlyCatalog, setElderlyCatalog] = useState<[number, string][]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await medicationService.getDoseHistory({
        from,
        to,
        take: 300,
        elderlyId: elderlyId ? Number(elderlyId) : undefined,
      });
      if (res.success && res.data) {
        setItems(res.data);
        if (!elderlyId) {
          const map = new Map<number, string>();
          for (const d of res.data) map.set(d.elderlyId, d.elderlyName);
          setElderlyCatalog([...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "vi")));
        }
      } else {
        setItems([]);
        toast.error(res.message || "Không tải được lịch sử cho uống.");
      }
    } catch (err) {
      setItems([]);
      toast.error(errMsg(err, "Không tải được lịch sử cho uống."));
    } finally {
      setLoading(false);
    }
  }, [from, to, elderlyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const elderlyOptions = elderlyCatalog;

  const scoped = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.elderlyName.toLowerCase().includes(term) ||
        i.medicationName.toLowerCase().includes(term) ||
        i.staffName.toLowerCase().includes(term),
    );
  }, [items, search]);

  const stats = useMemo(
    () => ({
      total: scoped.length,
      given: scoped.filter((i) => i.status.toLowerCase() === "given").length,
      refused: scoped.filter((i) => i.status.toLowerCase() === "refused").length,
      missed: scoped.filter((i) => i.status.toLowerCase() === "missed").length,
      pending: scoped.filter((i) => i.status.toLowerCase() === "pending").length,
    }),
    [scoped],
  );

  const rows = useMemo(
    () => (status === "all" ? scoped : scoped.filter((i) => i.status.toLowerCase() === status.toLowerCase())),
    [scoped, status],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-teal-700" />
            Lịch sử cho uống thuốc
          </CardTitle>
          <CardDescription>
            Dữ liệu từ MedicationRecords — lọc theo ngày, người cao tuổi và trạng thái. Không dùng bảng nhận thuốc / correction.
          </CardDescription>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Tải lại
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Từ ngày</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Đến ngày</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Người cao tuổi</span>
              <select
                className="flex h-9 w-52 rounded-md border border-input bg-transparent px-3 text-sm"
                value={elderlyId}
                onChange={(e) => setElderlyId(e.target.value)}
              >
                <option value="">Tất cả</option>
                {elderlyOptions.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-8"
                placeholder="Tìm tên cụ / thuốc / nhân viên…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusView)}>
            <TabsList>
              <TabsTrigger value="all">Tất cả ({stats.total})</TabsTrigger>
              <TabsTrigger value="Pending">Chờ ({stats.pending})</TabsTrigger>
              <TabsTrigger value="Given">Đã uống ({stats.given})</TabsTrigger>
              <TabsTrigger value="Refused">Từ chối ({stats.refused})</TabsTrigger>
              <TabsTrigger value="Missed">Thiếu ({stats.missed})</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Đang tải…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-sm text-slate-500">
              <Pill className="mx-auto mb-2 size-6 text-slate-400" />
              Không có liều thuốc trong khoảng đã chọn.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày / giờ dự kiến</TableHead>
                    <TableHead>Người cao tuổi</TableHead>
                    <TableHead>Thuốc</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi nhận</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow key={d.medicationRecordId}>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="font-medium">{formatDateVN(d.scheduledAt.slice(0, 10))}</div>
                        <div className="text-xs text-slate-500">{timeOf(d.scheduledAt)}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{d.elderlyName}</TableCell>
                      <TableCell className="text-sm">
                        <div>{d.medicationName}</div>
                        <div className="text-xs text-slate-500">{d.dosage}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusTone(d.status)}>
                          {d.statusLabel || d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">
                        {d.recordedAt ? (
                          <>
                            {formatDateVN(d.recordedAt.slice(0, 10))} {timeOf(d.recordedAt)}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{d.staffName || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-slate-600" title={d.notes ?? undefined}>
                        {d.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MedicationDoseHistoryView;
