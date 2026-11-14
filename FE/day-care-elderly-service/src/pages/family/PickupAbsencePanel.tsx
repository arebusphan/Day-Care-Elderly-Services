import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarX, Loader2, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import pickupAbsenceService from "../../services/pickupAbsenceService";
import type { AbsenceReport, SavePickupPersonDto } from "../../services/pickupAbsenceService";
import type { PickupPerson } from "../../services/attendanceService";
import { formatDateVN, localToday, nextWorkingDay } from "../../lib/date";

interface Props {
  elderly: { elderlyId: number; fullName: string }[];
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data?.errors?.filter((e) => e !== "ACCESS_DENIED").join(" ") ||
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  fallback;
const EMPTY: SavePickupPersonDto = { fullName: "", relationship: "", phoneNumber: "", idCardLast4: "" };

/** BR-30 người được đón + SR-32 báo vắng (phía gia đình) */
export function PickupAbsencePanel({ elderly }: Props) {
  const items = useMemo(() => elderly.map((e) => ({ value: String(e.elderlyId), label: e.fullName })), [elderly]);
  const [elderlyId, setElderlyId] = useState<string | null>(items[0]?.value ?? null);
  const [pickups, setPickups] = useState<PickupPerson[]>([]);
  const [absences, setAbsences] = useState<AbsenceReport[]>([]);

  const [editing, setEditing] = useState<PickupPerson | "new" | null>(null);
  const [form, setForm] = useState<SavePickupPersonDto>(EMPTY);
  const [saving, setSaving] = useState(false);

  const [absDate, setAbsDate] = useState(nextWorkingDay());
  const [absReason, setAbsReason] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!elderlyId && items[0]) setElderlyId(items[0].value);
  }, [items, elderlyId]);

  const load = useCallback(async () => {
    if (!elderlyId) return;
    try {
      const [p, a] = await Promise.all([pickupAbsenceService.listPickup(Number(elderlyId)), pickupAbsenceService.listAbsences()]);
      setPickups(p.data ?? []);
      setAbsences((a.data ?? []).filter((x) => x.elderlyId === Number(elderlyId)));
    } catch (err) {
      toast.error(errMsg(err, "Không tải được dữ liệu."));
    }
  }, [elderlyId]);

  useEffect(() => {
    load();
  }, [load]);

  if (items.length === 0) return null;

  const openEdit = (p: PickupPerson | "new") => {
    setEditing(p);
    setForm(p === "new" ? EMPTY : { fullName: p.fullName, relationship: p.relationship ?? "", phoneNumber: p.phoneNumber, idCardLast4: p.idCardLast4 });
  };

  const savePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elderlyId || !editing) return;
    setSaving(true);
    try {
      const dto = { ...form, relationship: form.relationship?.trim() || null };
      const res = editing === "new"
        ? await pickupAbsenceService.addPickup(Number(elderlyId), dto)
        : await pickupAbsenceService.updatePickup(editing.pickupPersonId, dto);
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không lưu được."));
    } finally {
      setSaving(false);
    }
  };

  const removePickup = async (p: PickupPerson) => {
    if (!window.confirm(`Xóa ${p.fullName} khỏi danh sách được đón?`)) return;
    try {
      await pickupAbsenceService.removePickup(p.pickupPersonId);
      toast.success("Đã xóa.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Không xóa được."));
    }
  };

  const report = async () => {
    if (!elderlyId) return;
    setReporting(true);
    try {
      const res = await pickupAbsenceService.reportAbsence(Number(elderlyId), absDate, absReason.trim() || undefined);
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      setAbsReason("");
      load();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không báo vắng được."));
    } finally {
      setReporting(false);
    }
  };

  const cancelAbsence = async (a: AbsenceReport) => {
    try {
      await pickupAbsenceService.cancelAbsence(a.absenceId);
      toast.success("Đã hủy báo vắng.");
      load();
    } catch (err) {
      toast.error(errMsg(err, "Không hủy được."));
    }
  };

  const today = localToday();

  return (
    <div className="space-y-4">
      {items.length > 1 && (
        <Select items={items} value={elderlyId} onValueChange={(v) => setElderlyId(v as string | null)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Chọn người thân" /></SelectTrigger>
          <SelectContent>
            {items.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><UserCheck className="size-4 text-emerald-600" /> Người được đón</CardTitle>
            <CardDescription>Trung tâm chỉ giao cụ cho người trong danh sách, đối chiếu 4 số cuối CCCD.</CardDescription>
            <CardAction>
              <Button size="sm" onClick={() => openEdit("new")} disabled={pickups.length >= 5}><Plus /> Thêm</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {pickups.length === 0 ? (
              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">Chưa có người được đón. Hãy thêm ít nhất một người trước ngày đầu tiên đến trung tâm.</p>
            ) : (
              <ul className="divide-y rounded-lg border text-sm">
                {pickups.map((p) => (
                  <li key={p.pickupPersonId} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <span className="font-medium">{p.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{p.relationship ?? "Người thân"} · {p.phoneNumber} · CCCD ••••{p.idCardLast4}</span>
                    </span>
                    <span className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)}><Pencil /></Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => removePickup(p)}><Trash2 className="text-destructive" /></Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><CalendarX className="size-4 text-rose-500" /> Báo vắng</CardTitle>
            <CardDescription>Trung tâm sẽ không xếp chỗ cho ngày đã báo vắng.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="abs-date">Ngày vắng</Label>
                <Input id="abs-date" type="date" min={today} className="w-40" value={absDate} onChange={(e) => setAbsDate(e.target.value)} />
              </div>
              <div className="min-w-40 flex-1 space-y-1.5">
                <Label htmlFor="abs-reason">Lý do</Label>
                <Input id="abs-reason" placeholder="Đi khám, việc gia đình..." value={absReason} onChange={(e) => setAbsReason(e.target.value)} />
              </div>
              <Button onClick={report} disabled={reporting}>{reporting && <Loader2 className="animate-spin" />}Báo vắng</Button>
            </div>
            {absences.length > 0 && (
              <ul className="divide-y rounded-lg border text-sm">
                {absences.map((a) => (
                  <li key={a.absenceId} className="flex items-center justify-between px-3 py-2">
                    <span>
                      {formatDateVN(a.absenceDate)}
                      {a.reason && <span className="block text-xs text-muted-foreground">{a.reason}</span>}
                    </span>
                    {a.absenceDate >= today && (
                      <Button variant="ghost" size="sm" onClick={() => cancelAbsence(a)}>Hủy</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Thêm người được đón" : "Sửa người được đón"}</DialogTitle>
            <DialogDescription>Nhân viên sẽ hỏi 4 số cuối CCCD khi giao cụ.</DialogDescription>
          </DialogHeader>
          <form id="pickup-form" onSubmit={savePickup} className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pk-name">Họ tên *</Label>
              <Input id="pk-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pk-rel">Quan hệ</Label>
                <Input id="pk-rel" placeholder="Con, cháu..." value={form.relationship ?? ""} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pk-phone">Số điện thoại *</Label>
                <Input id="pk-phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pk-last4">4 số cuối CCCD *</Label>
              <Input id="pk-last4" inputMode="numeric" maxLength={4} className="w-28" value={form.idCardLast4} onChange={(e) => setForm({ ...form, idCardLast4: e.target.value.replace(/\D/g, "") })} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
            <Button type="submit" form="pickup-form" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PickupAbsencePanel;
