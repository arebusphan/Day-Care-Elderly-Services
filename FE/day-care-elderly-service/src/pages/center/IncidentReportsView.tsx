import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Eye, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "../../services/api";
import incidentReportService, {
  INCIDENT_SEVERITY_LABEL,
  INCIDENT_STATUS_LABEL,
} from "../../services/incidentReportService";
import type { IncidentReport, IncidentSeverity, IncidentStatus } from "../../services/incidentReportService";
import type { PagedResult } from "../../types/common";
import TablePagination from "../../components/TablePagination";
import IncidentDetailDialog from "./IncidentDetailDialog";
import { formatDateTimeVN } from "../../lib/date";

const PAGE_SIZE = 10;
const ALL = "all";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const statusItems = [
  { value: ALL, label: "Mọi trạng thái" },
  ...Object.entries(INCIDENT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];
const severityItems = Object.entries(INCIDENT_SEVERITY_LABEL).map(([value, label]) => ({ value, label }));
const severityFilterItems = [{ value: ALL, label: "Mọi mức độ" }, ...severityItems];
const supplyItems = [
  { value: ALL, label: "Vật tư: tất cả" },
  { value: "true", label: "Đã xác nhận vật tư" },
  { value: "false", label: "Chưa xác nhận vật tư" },
];

const SEVERITY_CLASS: Record<IncidentSeverity, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-600 text-white",
};
const STATUS_VARIANT: Record<IncidentStatus, "destructive" | "secondary" | "outline"> = {
  Open: "destructive",
  InProgress: "secondary",
  Resolved: "outline",
};

/** ISO → giá trị cho <input type="datetime-local"> */
const toLocalInput = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface ElderlyOption {
  value: string;
  label: string;
}

interface EditForm {
  elderlyId: string | null;
  incidentType: string;
  severity: IncidentSeverity;
  description: string;
  occurredAt: string;
  resolutionNotes: string;
}

export function IncidentReportsView() {
  const [data, setData] = useState<PagedResult<IncidentReport> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [supply, setSupply] = useState(ALL);

  const [elderlyOptions, setElderlyOptions] = useState<ElderlyOption[]>([]);

  // chi tiết / xử lý
  const [detail, setDetail] = useState<IncidentReport | null>(null);

  // tạo / sửa
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<IncidentReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await incidentReportService.list({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: status === ALL ? undefined : status,
        severity: severity === ALL ? undefined : severity,
        isSupplyConfirmed: supply === ALL ? undefined : supply === "true",
      });
      if (res.success && res.data) setData(res.data);
      else toast.error(res.message || "Không tải được danh sách sự cố.");
    } catch (err) {
      toast.error(errMsg(err, "Không tải được danh sách sự cố."));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, severity, supply]);

  useEffect(() => {
    load();
  }, [load]);

  // debounce ô tìm kiếm
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    api
      .get("/api/center/elderly")
      .then((res) => {
        const list = (res.data?.data ?? []) as { elderlyId: number; fullName: string }[];
        setElderlyOptions(list.map((e) => ({ value: String(e.elderlyId), label: e.fullName })));
      })
      .catch(() => setElderlyOptions([]));
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: unknown) => {
    setter((v as string) ?? ALL);
    setPage(1);
  };

  const openDetail = (i: IncidentReport) => setDetail(i);

  const replaceRow = (updated: IncidentReport) => {
    setData((d) => d && { ...d, items: d.items.map((x) => (x.incidentId === updated.incidentId ? updated : x)) });
    setDetail((cur) => (cur && cur.incidentId === updated.incidentId ? updated : cur));
  };

  const toggleSupply = async (i: IncidentReport, value: boolean) => {
    try {
      const res = await incidentReportService.confirmSupply(i.incidentId, value);
      if (res.success && res.data) {
        replaceRow(res.data);
        toast.success(res.message || (value ? "Đã xác nhận vật tư." : "Đã bỏ xác nhận vật tư."));
      } else toast.error(res.message || "Không cập nhật được xác nhận vật tư.");
    } catch (err) {
      toast.error(errMsg(err, "Không cập nhật được xác nhận vật tư."));
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      elderlyId: null,
      incidentType: "",
      severity: "Medium",
      description: "",
      occurredAt: toLocalInput(),
      resolutionNotes: "",
    });
    setFormOpen(true);
  };

  const openEdit = (i: IncidentReport) => {
    setDetail(null);
    setEditingId(i.incidentId);
    setForm({
      elderlyId: String(i.elderlyId),
      incidentType: i.incidentType,
      severity: i.severity,
      description: i.description,
      occurredAt: toLocalInput(i.occurredAt),
      resolutionNotes: i.resolutionNotes ?? "",
    });
    setFormOpen(true);
  };

  const saveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!editingId && !form.elderlyId) return toast.error("Vui lòng chọn người cao tuổi.");
    if (!form.incidentType.trim() || !form.description.trim()) return toast.error("Nhập loại và mô tả sự cố.");
    setSaving(true);
    try {
      const common = {
        incidentType: form.incidentType.trim(),
        severity: form.severity,
        description: form.description.trim(),
        occurredAt: form.occurredAt || undefined,
      };
      const res = editingId
        ? await incidentReportService.update(editingId, {
            ...common,
            resolutionNotes: form.resolutionNotes.trim() || undefined,
          })
        : await incidentReportService.create({ ...common, elderlyId: Number(form.elderlyId) });
      if (res.success) {
        toast.success(editingId ? "Đã cập nhật sự cố." : "Đã ghi nhận sự cố.");
        setFormOpen(false);
        load();
      } else toast.error(res.message || "Không lưu được sự cố.");
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được sự cố."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const res = await incidentReportService.remove(toDelete.incidentId);
      if (res.success) {
        toast.success("Đã xóa sự cố.");
        if (data && data.items.length === 1 && page > 1) setPage(page - 1);
        else load();
      } else toast.error(res.message || "Không xóa được sự cố.");
    } catch (err) {
      toast.error(errMsg(err, "Không xóa được sự cố."));
    } finally {
      setToDelete(null);
    }
  };

  const openCount = useMemo(() => data?.items.filter((i) => i.status !== "Resolved").length ?? 0, [data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-orange-600" /> Báo cáo sự cố
          </CardTitle>
          <CardDescription>
            Theo dõi, xử lý và xác nhận vật tư cho các sự cố của người cao tuổi
            {data ? ` · ${openCount} chưa xử lý trên trang này` : ""}.
          </CardDescription>
          <CardAction className="flex gap-2">
            <Button variant="outline" size="icon" title="Tải lại" onClick={load}>
              <RefreshCw />
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Ghi nhận sự cố
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Tìm theo tên, loại sự cố..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select items={statusItems} value={status} onValueChange={onFilter(setStatus)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={severityFilterItems} value={severity} onValueChange={onFilter(setSeverity)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityFilterItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={supplyItems} value={supply} onValueChange={onFilter(setSupply)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supplyItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời điểm</TableHead>
                <TableHead>Người cao tuổi</TableHead>
                <TableHead>Loại sự cố</TableHead>
                <TableHead>Mức độ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Vật tư</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center">
                    <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !data || data.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Không có sự cố nào.
                  </TableCell>
                </TableRow>
              ) : (
                data.items.map((i) => (
                  <TableRow key={i.incidentId} className={loading ? "opacity-60" : ""}>
                    <TableCell className="text-xs">{formatDateTimeVN(i.occurredAt)}</TableCell>
                    <TableCell className="font-medium">{i.elderlyName}</TableCell>
                    <TableCell className="max-w-48 truncate">{i.incidentType}</TableCell>
                    <TableCell>
                      <Badge className={SEVERITY_CLASS[i.severity] ?? ""}>
                        {INCIDENT_SEVERITY_LABEL[i.severity] ?? i.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[i.status] ?? "outline"}>
                        {INCIDENT_STATUS_LABEL[i.status] ?? i.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={i.isSupplyConfirmed}
                        onCheckedChange={(v) => toggleSupply(i, v)}
                        aria-label="Xác nhận vật tư"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" title="Chi tiết & xử lý" onClick={() => openDetail(i)}>
                          <Eye />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={i.isSupplyConfirmed ? "Đã xác nhận vật tư — không thể xóa" : "Xóa"}
                          disabled={i.isSupplyConfirmed}
                          onClick={() => setToDelete(i)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data && (
            <TablePagination
              page={data.pageNumber}
              totalPages={data.totalPages}
              totalItems={data.totalItems}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Chi tiết: xử lý, chuyển viện, vật tư (trừ kho + phí), ảnh */}
      <IncidentDetailDialog
        incident={detail}
        onClose={() => setDetail(null)}
        onChanged={replaceRow}
        onEdit={openEdit}
      />

      {/* Tạo / sửa */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sửa sự cố" : "Ghi nhận sự cố"}</DialogTitle>
          </DialogHeader>
          {form && (
            <form id="incident-form" onSubmit={saveForm} className="grid gap-3">
              {!editingId && (
                <div className="space-y-1.5">
                  <Label>Người cao tuổi *</Label>
                  <Select
                    items={elderlyOptions}
                    value={form.elderlyId}
                    onValueChange={(v) => setForm({ ...form, elderlyId: v as string | null })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn người cao tuổi" />
                    </SelectTrigger>
                    <SelectContent>
                      {elderlyOptions.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="inc-type">Loại sự cố *</Label>
                  <Input
                    id="inc-type"
                    maxLength={100}
                    placeholder="Té ngã, sốt, khó thở..."
                    value={form.incidentType}
                    onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mức độ *</Label>
                  <Select
                    items={severityItems}
                    value={form.severity}
                    onValueChange={(v) => setForm({ ...form, severity: v as IncidentSeverity })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {severityItems.map((it) => (
                        <SelectItem key={it.value} value={it.value}>
                          {it.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-at">Thời điểm xảy ra</Label>
                <Input
                  id="inc-at"
                  type="datetime-local"
                  value={form.occurredAt}
                  onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-desc">Mô tả *</Label>
                <Textarea
                  id="inc-desc"
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              {editingId && (
                <div className="space-y-1.5">
                  <Label htmlFor="inc-res">Ghi chú xử lý</Label>
                  <Textarea
                    id="inc-res"
                    rows={2}
                    value={form.resolutionNotes}
                    onChange={(e) => setForm({ ...form, resolutionNotes: e.target.value })}
                  />
                </div>
              )}
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="incident-form" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xóa */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sự cố này?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.incidentType} — {toDelete?.elderlyName}. Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default IncidentReportsView;
