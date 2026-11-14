import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Pencil, Pill, Plus, RefreshCw, X } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import careLogService from "../../services/careLogService";
import type { StaffElderlyToday } from "../../services/careLogService";
import medicationService from "../../services/medicationService";
import type { MedicationPlan } from "../../services/medicationService";
import { formatDateVN, localToday } from "../../lib/date";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

interface PlanForm {
  medicationName: string;
  dosage: string;
  instructions: string;
  scheduleTimes: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  generateDays: string;
}

const emptyForm = (): PlanForm => ({
  medicationName: "",
  dosage: "",
  instructions: "",
  scheduleTimes: ["08:00"],
  startDate: localToday(),
  endDate: "",
  isActive: true,
  generateDays: "14",
});

export function MedicationPlanView() {
  const [elderly, setElderly] = useState<StaffElderlyToday[]>([]);
  const [elderlyId, setElderlyId] = useState<string | null>(null);
  const [plans, setPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // dialog tạo / sửa
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [timesChanged, setTimesChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  // dialog sinh lịch liều
  const [genPlan, setGenPlan] = useState<MedicationPlan | null>(null);
  const [genFrom, setGenFrom] = useState("");
  const [genTo, setGenTo] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    careLogService
      .getTodayElderly()
      .then((list) => {
        setElderly(list);
        if (list.length > 0) setElderlyId(String(list[0].elderlyId));
      })
      .catch((err) => toast.error(errMsg(err, "Không tải được danh sách người cao tuổi.")));
  }, []);

  const loadPlans = useCallback(async () => {
    if (!elderlyId) return;
    setLoading(true);
    try {
      const res = await medicationService.getPlans(Number(elderlyId));
      if (res.success && res.data) setPlans(res.data);
      else toast.error(res.message || "Không tải được kế hoạch thuốc.");
    } catch (err) {
      toast.error(errMsg(err, "Không tải được kế hoạch thuốc."));
    } finally {
      setLoading(false);
    }
  }, [elderlyId]);

  useEffect(() => {
    setPlans([]);
    loadPlans();
  }, [loadPlans]);

  const elderlyItems = useMemo(
    () => elderly.map((e) => ({ value: String(e.elderlyId), label: e.fullName })),
    [elderly],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setTimesChanged(false);
    setFormOpen(true);
  };

  const openEdit = (p: MedicationPlan) => {
    setEditing(p);
    setForm({
      medicationName: p.medicationName,
      dosage: p.dosage,
      instructions: p.instructions ?? "",
      scheduleTimes: p.scheduleTimes.length ? [...p.scheduleTimes] : ["08:00"],
      startDate: p.startDate.slice(0, 10),
      endDate: p.endDate?.slice(0, 10) ?? "",
      isActive: p.isActive,
      generateDays: "14",
    });
    setTimesChanged(false);
    setFormOpen(true);
  };

  const setTime = (i: number, v: string) => {
    setTimesChanged(true);
    setForm((f) => ({ ...f, scheduleTimes: f.scheduleTimes.map((t, idx) => (idx === i ? v : t)) }));
  };
  const addTime = () => {
    setTimesChanged(true);
    setForm((f) => ({ ...f, scheduleTimes: [...f.scheduleTimes, "12:00"] }));
  };
  const removeTime = (i: number) => {
    setTimesChanged(true);
    setForm((f) => ({ ...f, scheduleTimes: f.scheduleTimes.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!elderlyId) return;
    const times = [...new Set(form.scheduleTimes.filter(Boolean))].sort();
    if (!form.medicationName.trim() || !form.dosage.trim()) return toast.error("Nhập tên thuốc và liều dùng.");
    if (times.length === 0) return toast.error("Cần ít nhất một giờ uống.");
    if (form.endDate && form.endDate < form.startDate) return toast.error("Ngày kết thúc phải sau ngày bắt đầu.");

    const base = {
      medicationName: form.medicationName.trim(),
      dosage: form.dosage.trim(),
      instructions: form.instructions.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      const res = editing
        ? await medicationService.updatePlan(editing.medicationPlanId, {
            ...base,
            scheduleTimes: timesChanged ? times : undefined,
          })
        : await medicationService.createPlan(Number(elderlyId), {
            ...base,
            scheduleTimes: times,
            generateDays: Number(form.generateDays) || undefined,
          });
      if (res.success) {
        toast.success(editing ? "Đã cập nhật kế hoạch thuốc." : "Đã tạo kế hoạch thuốc.");
        setFormOpen(false);
        loadPlans();
      } else {
        toast.error(res.message || "Không lưu được kế hoạch.");
      }
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được kế hoạch."));
    } finally {
      setSaving(false);
    }
  };

  const openGenerate = (p: MedicationPlan) => {
    setGenPlan(p);
    const today = localToday();
    setGenFrom(p.startDate.slice(0, 10) > today ? p.startDate.slice(0, 10) : today);
    setGenTo(p.endDate?.slice(0, 10) ?? "");
  };

  const handleGenerate = async () => {
    if (!genPlan) return;
    setGenerating(true);
    try {
      const res = await medicationService.generateDoses(genPlan.medicationPlanId, {
        scheduleTimes: genPlan.scheduleTimes,
        from: genFrom || undefined,
        to: genTo || undefined,
      });
      if (res.success && res.data) {
        toast.success(
          `Đã tạo ${res.data.createdCount} liều (${formatDateVN(res.data.from)} → ${formatDateVN(res.data.to)}), bỏ qua ${res.data.skippedExistingCount} liều đã có.`,
        );
        setGenPlan(null);
        loadPlans();
      } else {
        toast.error(res.message || "Không sinh được lịch liều.");
      }
    } catch (err) {
      toast.error(errMsg(err, "Không sinh được lịch liều."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="size-4 text-emerald-600" /> Kế hoạch dùng thuốc
          </CardTitle>
          <CardDescription>
            Tạo lịch uống thuốc cho người cao tuổi. Hệ thống tự sinh các liều và gửi nhắc khi đến giờ.
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            <Select items={elderlyItems} value={elderlyId} onValueChange={(v) => setElderlyId(v as string | null)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Chọn người cao tuổi" />
              </SelectTrigger>
              <SelectContent>
                {elderlyItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" title="Tải lại" onClick={loadPlans} disabled={!elderlyId}>
              <RefreshCw />
            </Button>
            <Button onClick={openCreate} disabled={!elderlyId}>
              <Plus /> Thêm kế hoạch
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {elderly.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Hôm nay chưa có người cao tuổi nào được phân công cho bạn.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thuốc</TableHead>
                  <TableHead>Liều dùng</TableHead>
                  <TableHead>Giờ uống</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-center">Liều chờ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Chưa có kế hoạch thuốc nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((p) => (
                    <TableRow key={p.medicationPlanId}>
                      <TableCell className="max-w-56 whitespace-normal">
                        <p className="font-medium">{p.medicationName}</p>
                        {p.instructions && <p className="text-xs text-muted-foreground">{p.instructions}</p>}
                      </TableCell>
                      <TableCell>{p.dosage}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {p.scheduleTimes.map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDateVN(p.startDate)}
                        <br />→ {p.endDate ? formatDateVN(p.endDate) : "Không thời hạn"}
                      </TableCell>
                      <TableCell className="text-center">{p.pendingDoseCount}</TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "secondary" : "ghost"}>
                          {p.isActive ? "Đang dùng" : "Đã dừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" title="Sửa" onClick={() => openEdit(p)}>
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sinh lịch liều"
                            disabled={!p.isActive}
                            onClick={() => openGenerate(p)}
                          >
                            <CalendarPlus />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tạo / sửa kế hoạch */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa kế hoạch thuốc" : "Thêm kế hoạch thuốc"}</DialogTitle>
            <DialogDescription>
              {elderly.find((e) => String(e.elderlyId) === elderlyId)?.fullName}
            </DialogDescription>
          </DialogHeader>
          <form id="med-plan-form" onSubmit={handleSave} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="med-name">Tên thuốc *</Label>
                <Input
                  id="med-name"
                  value={form.medicationName}
                  onChange={(e) => setForm({ ...form, medicationName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="med-dosage">Liều dùng *</Label>
                <Input
                  id="med-dosage"
                  placeholder="1 viên 500mg"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-instr">Hướng dẫn</Label>
              <Textarea
                id="med-instr"
                rows={2}
                placeholder="Uống sau ăn..."
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giờ uống *</Label>
              <div className="flex flex-wrap items-center gap-2">
                {form.scheduleTimes.map((t, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input type="time" className="w-28" value={t} onChange={(e) => setTime(i, e.target.value)} />
                    {form.scheduleTimes.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeTime(i)}>
                        <X />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTime}>
                  <Plus /> Thêm giờ
                </Button>
              </div>
              {editing && timesChanged && (
                <p className="text-xs text-amber-600">Đổi giờ uống sẽ sinh lại các liều chưa uống trong tương lai.</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="med-start">Bắt đầu *</Label>
                <Input
                  id="med-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="med-end">Kết thúc</Label>
                <Input
                  id="med-end"
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label htmlFor="med-days">Sinh liều (ngày)</Label>
                  <Input
                    id="med-days"
                    type="number"
                    min={1}
                    max={60}
                    value={form.generateDays}
                    onChange={(e) => setForm({ ...form, generateDays: e.target.value })}
                  />
                </div>
              )}
            </div>
            <Label className="flex items-center gap-2 font-normal">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              {form.isActive ? "Đang dùng" : "Tạm dừng"}
            </Label>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="med-plan-form" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              {editing ? "Lưu thay đổi" : "Tạo kế hoạch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sinh lịch liều */}
      <Dialog open={!!genPlan} onOpenChange={(o) => !o && setGenPlan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sinh lịch liều</DialogTitle>
            <DialogDescription>
              {genPlan?.medicationName} · giờ uống {genPlan?.scheduleTimes.join(", ")}. Liều đã có sẽ được bỏ qua.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="gen-from">Từ ngày</Label>
              <Input id="gen-from" type="date" value={genFrom} onChange={(e) => setGenFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-to">Đến ngày</Label>
              <Input id="gen-to" type="date" min={genFrom} value={genTo} onChange={(e) => setGenTo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenPlan(null)}>
              Hủy
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="animate-spin" />}
              Sinh lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MedicationPlanView;
