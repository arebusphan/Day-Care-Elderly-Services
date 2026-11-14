import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import incidentReportService, { INCIDENT_SEVERITY_LABEL, INCIDENT_STATUS_LABEL } from "../../services/incidentReportService";
import type { IncidentReport, IncidentStatus, IncidentSupplyUsage } from "../../services/incidentReportService";
import medicalSupplyService from "../../services/medicalSupplyService";
import type { MedicalSupply } from "../../services/medicalSupplyService";
import { formatDateTimeVN } from "../../lib/date";

interface Props {
  incident: IncidentReport | null;
  onClose: () => void;
  /** Gọi khi sự cố thay đổi để danh sách cập nhật */
  onChanged: (updated: IncidentReport) => void;
  onEdit: (incident: IncidentReport) => void;
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const statusItems = Object.entries(INCIDENT_STATUS_LABEL).map(([value, label]) => ({ value, label }));

/** Chi tiết sự cố: xử lý & chuyển viện (SRS 3.9.1), vật tư đã dùng + phí riêng (F-14), ảnh */
export function IncidentDetailDialog({ incident, onClose, onChanged, onEdit }: Props) {
  const [status, setStatus] = useState<IncidentStatus>("Open");
  const [resolution, setResolution] = useState("");
  const [actions, setActions] = useState("");
  const [hospital, setHospital] = useState("");
  const [hospitalAt, setHospitalAt] = useState("");
  const [escort, setEscort] = useState("");
  const [saving, setSaving] = useState(false);

  const [usage, setUsage] = useState<IncidentSupplyUsage[]>([]);
  const [supplies, setSupplies] = useState<MedicalSupply[]>([]);
  const [pending, setPending] = useState<{ supplyId: number; quantity: number }[]>([]);
  const [pickSupply, setPickSupply] = useState<string | null>(null);
  const [pickQty, setPickQty] = useState("1");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setStatus(incident.status);
    setResolution(incident.resolutionNotes ?? "");
    setActions(incident.handlingActions ?? "");
    setHospital(incident.hospitalName ?? "");
    setHospitalAt(toLocalInput(incident.hospitalTransferAt));
    setEscort(incident.hospitalEscort ?? "");
    setPending([]);
    setPickSupply(null);
    setPickQty("1");
    incidentReportService.getSupplies(incident.incidentId).then((r) => setUsage(r.data ?? [])).catch(() => setUsage([]));
    medicalSupplyService
      .list({ pageNumber: 1, pageSize: 100, isActive: true })
      .then((r) => setSupplies(r.data?.items ?? []))
      .catch(() => setSupplies([]));
  }, [incident]);

  const supplyItems = useMemo(
    () => supplies.map((s) => ({ value: String(s.supplyId), label: `${s.supplyName} (còn ${s.quantityInStock} ${s.unit})` })),
    [supplies],
  );
  const supplyById = (id: number) => supplies.find((s) => s.supplyId === id);
  const pendingCharge = pending.reduce((sum, p) => sum + (supplyById(p.supplyId)?.unitPrice ?? 0) * p.quantity, 0);

  if (!incident) return null;

  const saveHandling = async () => {
    setSaving(true);
    try {
      let current = incident;
      const detailRes = await incidentReportService.update(incident.incidentId, {
        incidentType: incident.incidentType,
        severity: incident.severity,
        description: incident.description,
        handlingActions: actions,
        hospitalName: hospital,
        hospitalEscort: escort,
        hospitalTransferAt: hospitalAt || undefined,
      });
      if (!detailRes.success || !detailRes.data) throw new Error(detailRes.message);
      current = detailRes.data;
      if (status !== incident.status || resolution !== (incident.resolutionNotes ?? "")) {
        const st = await incidentReportService.updateStatus(incident.incidentId, status, resolution.trim() || undefined);
        if (!st.success || !st.data) throw new Error(st.message);
        current = { ...st.data, ...detailRes.data, status: st.data.status, resolutionNotes: st.data.resolutionNotes, resolvedAt: st.data.resolvedAt };
      }
      onChanged(current);
      toast.success("Đã lưu thông tin xử lý sự cố.");
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không lưu được thông tin xử lý."));
    } finally {
      setSaving(false);
    }
  };

  const addPending = () => {
    const qty = Number(pickQty);
    if (!pickSupply || !(qty > 0)) return toast.error("Chọn vật tư và nhập số lượng > 0.");
    const id = Number(pickSupply);
    setPending((prev) => {
      const found = prev.find((p) => p.supplyId === id);
      return found ? prev.map((p) => (p.supplyId === id ? { ...p, quantity: p.quantity + qty } : p)) : [...prev, { supplyId: id, quantity: qty }];
    });
    setPickQty("1");
  };

  const recordSupplies = async () => {
    if (pending.length === 0) return;
    setRecording(true);
    try {
      const res = await incidentReportService.recordSupplies(incident.incidentId, pending);
      if (!res.success) throw new Error(res.message);
      setUsage(res.data ?? []);
      setPending([]);
      const refreshed = await incidentReportService.get(incident.incidentId);
      if (refreshed.data) onChanged(refreshed.data);
      const sup = await medicalSupplyService.list({ pageNumber: 1, pageSize: 100, isActive: true });
      setSupplies(sup.data?.items ?? []);
      toast.success("Đã ghi vật tư và trừ kho. Gia đình đã được thông báo.");
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không ghi được vật tư."));
    } finally {
      setRecording(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const res = await incidentReportService.uploadPhotos(incident.incidentId, Array.from(files));
      if (!res.success) throw new Error(res.message);
      onChanged({ ...incident, photoUrls: res.data ?? incident.photoUrls });
      toast.success("Đã tải ảnh.");
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không tải được ảnh."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={!!incident} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{incident.incidentType}</DialogTitle>
          <DialogDescription>
            {incident.elderlyName} · {formatDateTimeVN(incident.occurredAt)} · báo bởi {incident.reportedByName}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity}</Badge>
          <Badge variant={incident.status === "Resolved" ? "outline" : "destructive"}>
            {INCIDENT_STATUS_LABEL[incident.status] ?? incident.status}
          </Badge>
          {incident.handledByName && <Badge variant="secondary">Xử lý: {incident.handledByName}</Badge>}
          {incident.supplyChargeAmount > 0 && <Badge variant="secondary">Phí vật tư: {money(incident.supplyChargeAmount)}</Badge>}
        </div>
        <p className="text-sm whitespace-pre-line">{incident.description}</p>

        <Tabs defaultValue="handling">
          <TabsList>
            <TabsTrigger value="handling">Xử lý & chuyển viện</TabsTrigger>
            <TabsTrigger value="supplies">Vật tư ({usage.length})</TabsTrigger>
            <TabsTrigger value="photos">Ảnh ({incident.photoUrls?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="handling" className="grid gap-3 pt-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select items={statusItems} value={status} onValueChange={(v) => setStatus(v as IncidentStatus)}>
                  <SelectTrigger className="w-full">
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-hospital">Chuyển viện tới</Label>
                <Input id="inc-hospital" placeholder="Tên bệnh viện (nếu có)" value={hospital} onChange={(e) => setHospital(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-hospital-at">Thời điểm chuyển viện</Label>
                <Input id="inc-hospital-at" type="datetime-local" value={hospitalAt} onChange={(e) => setHospitalAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inc-escort">Nhân viên đi cùng</Label>
                <Input id="inc-escort" value={escort} onChange={(e) => setEscort(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-actions">Các bước đã xử lý / sơ cứu</Label>
              <Textarea id="inc-actions" rows={2} value={actions} onChange={(e) => setActions(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inc-resolution">Kết quả xử lý</Label>
              <Textarea id="inc-resolution" rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onEdit(incident)}>
                Sửa thông tin chung
              </Button>
              <Button onClick={saveHandling} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Lưu xử lý
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="supplies" className="space-y-3 pt-2">
            {usage.length > 0 ? (
              <ul className="divide-y rounded-lg border text-sm">
                {usage.map((u) => (
                  <li key={u.supplyTransactionId} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {u.supplyName} × {u.quantity} {u.unit}
                      <span className="block text-xs text-muted-foreground">
                        {formatDateTimeVN(u.occurredAt)} · {u.recordedByName}
                      </span>
                    </span>
                    <span className="tabular-nums">{money(u.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Chưa ghi vật tư nào cho sự cố này.</p>
            )}
            <Separator />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1 space-y-1.5">
                <Label>Vật tư</Label>
                <Select items={supplyItems} value={pickSupply} onValueChange={(v) => setPickSupply(v as string | null)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn vật tư" />
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
              <div className="w-24 space-y-1.5">
                <Label htmlFor="sup-qty-pick">Số lượng</Label>
                <Input id="sup-qty-pick" type="number" min={0} step="any" value={pickQty} onChange={(e) => setPickQty(e.target.value)} />
              </div>
              <Button variant="outline" onClick={addPending}>
                <Plus /> Thêm
              </Button>
            </div>
            {pending.length > 0 && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                {pending.map((p) => {
                  const s = supplyById(p.supplyId);
                  return (
                    <div key={p.supplyId} className="flex items-center justify-between text-sm">
                      <span>
                        <Package className="mr-1 inline size-3.5" />
                        {s?.supplyName} × {p.quantity} {s?.unit}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums">{money((s?.unitPrice ?? 0) * p.quantity)}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => setPending((prev) => prev.filter((x) => x.supplyId !== p.supplyId))}>
                          <Trash2 />
                        </Button>
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
                  <span>Phí tính riêng cho gia đình</span>
                  <span className="tabular-nums">{money(pendingCharge)}</span>
                </div>
                <div className="flex justify-end">
                  <Button onClick={recordSupplies} disabled={recording}>
                    {recording && <Loader2 className="animate-spin" />}
                    Ghi vật tư & trừ kho
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-3 pt-2">
            {(incident.photoUrls ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Chưa có ảnh.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {incident.photoUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ảnh sự cố" className="aspect-square w-full rounded-lg border object-cover" />
                  </a>
                ))}
              </div>
            )}
            <Label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              Tải ảnh lên (jpg, png, webp ≤ 5MB)
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => uploadPhotos(e.target.files)} />
            </Label>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IncidentDetailDialog;
