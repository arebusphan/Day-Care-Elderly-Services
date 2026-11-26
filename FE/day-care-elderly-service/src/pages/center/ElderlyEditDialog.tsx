import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserRoundPen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import centerProfileService from "../../services/centerProfileService";
import type { ElderlyDetail, UpdateElderlyDto } from "../../services/centerProfileService";

interface Props {
  elderlyId: number | null;
  onClose: () => void;
  onChanged: () => void;
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data?.errors?.join(" ") ||
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  fallback;

const mobilityItems = [
  { value: "Normal", label: "Bình thường" },
  { value: "Support", label: "Cần hỗ trợ" },
];
const genderItems = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
  { value: "Other", label: "Khác" },
];

type Form = Required<{ [K in Exclude<keyof UpdateElderlyDto, "chronicConditions">]: string }>;

/** Bệnh nền có mã: dùng để hiện thêm hoạt động riêng (đo đường huyết, huyết áp…) trong lịch của gói */
const CHRONIC_OPTIONS = [
  { code: "DIABETES", label: "Tiểu đường" },
  { code: "HYPERTENSION", label: "Tăng huyết áp" },
  { code: "HEART", label: "Bệnh tim mạch" },
];
const toForm = (d: ElderlyDetail): Form => ({
  fullName: d.fullName,
  dateOfBirth: d.dateOfBirth ?? "",
  gender: d.gender ?? "",
  address: d.address ?? "",
  emergencyContactName: d.emergencyContactName ?? "",
  emergencyContactPhone: d.emergencyContactPhone ?? "",
  allergies: d.allergies ?? "",
  medicalHistory: d.medicalHistory ?? "",
  medicalNotes: d.medicalNotes ?? "",
  mobilityStatus: d.mobilityStatus,
  careNotes: d.careNotes ?? "",
  emergencyNotes: d.emergencyNotes ?? "",
});

/** SRS 3.4.3: Manager sửa hồ sơ, xác nhận nhóm đối tượng (BR-79), vô hiệu hóa (xóa mềm) */
export function ElderlyEditDialog({ elderlyId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<ElderlyDetail | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (elderlyId === null) return;
    setDetail(null);
    setForm(null);
    centerProfileService
      .getElderly(elderlyId)
      .then((res) => {
        if (res.data) {
          setDetail(res.data);
          setForm(toForm(res.data));
          setConditions(res.data.chronicConditions ?? []);
        }
      })
      .catch((err) => toast.error(errMsg(err, "Không tải được hồ sơ.")));
  }, [elderlyId]);

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || elderlyId === null) return;
    if (!form.fullName.trim()) return toast.error("Nhập họ tên.");
    setSaving(true);
    try {
      const payload = {
        ...(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])) as unknown as UpdateElderlyDto),
        chronicConditions: conditions,
      };
      const res = await centerProfileService.updateElderly(elderlyId, payload);
      if (!res.success || !res.data) throw new Error(res.message);
      setDetail(res.data);
      toast.success("Đã cập nhật hồ sơ.");
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không lưu được hồ sơ."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!detail) return;
    const next = !detail.isActive;
    if (!next && !window.confirm(`Vô hiệu hóa hồ sơ ${detail.fullName}? Lịch sử vẫn được giữ lại.`)) return;
    setToggling(true);
    try {
      const res = await centerProfileService.setElderlyActive(detail.elderlyId, next);
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      onChanged();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không đổi được trạng thái."));
    } finally {
      setToggling(false);
    }
  };

  return (
    <Dialog open={elderlyId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPen className="size-4 text-emerald-600" /> Hồ sơ người cao tuổi
          </DialogTitle>
          <DialogDescription>
            {detail ? `Mã ELD-${String(detail.elderlyId).padStart(4, "0")}` : "Đang tải..."}
          </DialogDescription>
        </DialogHeader>
        {detail && form && (
          <>
            <div className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs sm:grid-cols-3">
              <div>
                <p className="font-semibold">Gia đình</p>
                {detail.familyContacts.length ? detail.familyContacts.map((c) => <p key={c}>{c}</p>) : <p className="text-muted-foreground">—</p>}
              </div>
              <div>
                <p className="font-semibold">Gói đang dùng</p>
                {detail.activePackages.length ? detail.activePackages.map((c) => <p key={c}>{c}</p>) : <p className="text-muted-foreground">Chưa có</p>}
              </div>
              <div>
                <p className="font-semibold">Nhân viên phụ trách hôm nay</p>
                {detail.assignedStaffToday.length ? (
                  detail.assignedStaffToday.map((c) => <Badge key={c} variant="secondary" className="mr-1">{c}</Badge>)
                ) : (
                  <p className="text-muted-foreground">Chưa phân công</p>
                )}
              </div>
            </div>
            <form id="elderly-edit-form" onSubmit={save} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="el-name">Họ tên *</Label>
                  <Input id="el-name" value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-dob">Ngày sinh</Label>
                  <Input id="el-dob" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Giới tính</Label>
                  <Select items={genderItems} value={form.gender || null} onValueChange={(v) => set("gender")((v as string) ?? "")}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {genderItems.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nhóm đối tượng (đã xác nhận)</Label>
                  <Select items={mobilityItems} value={form.mobilityStatus} onValueChange={(v) => set("mobilityStatus")(v as string)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mobilityItems.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-ecp">SĐT khẩn cấp</Label>
                  <Input id="el-ecp" value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone")(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="el-addr">Địa chỉ</Label>
                  <Input id="el-addr" value={form.address} onChange={(e) => set("address")(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-ecn">Người liên hệ khẩn cấp</Label>
                  <Input id="el-ecn" value={form.emergencyContactName} onChange={(e) => set("emergencyContactName")(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="el-allergy">Dị ứng</Label>
                  <Textarea id="el-allergy" rows={2} value={form.allergies} onChange={(e) => set("allergies")(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-history">Tiền sử bệnh</Label>
                  <Textarea id="el-history" rows={2} value={form.medicalHistory} onChange={(e) => set("medicalHistory")(e.target.value)} />
                </div>
                <fieldset className="space-y-1.5 sm:col-span-2">
                  <legend className="text-sm font-medium">Bệnh nền (dùng cho lịch hoạt động)</legend>
                  <div className="flex flex-wrap gap-4">
                    {CHRONIC_OPTIONS.map((option) => (
                      <label key={option.code} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={conditions.includes(option.code)}
                          onChange={(e) => setConditions((current) => e.target.checked ? [...current, option.code] : current.filter((c) => c !== option.code))}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Ví dụ: cụ tiểu đường sẽ có thêm việc đo đường huyết lúc đói, trước và sau tập.</p>
                </fieldset>
                <div className="space-y-1.5">
                  <Label htmlFor="el-care">Ghi chú chăm sóc</Label>
                  <Textarea id="el-care" rows={2} value={form.careNotes} onChange={(e) => set("careNotes")(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="el-emerg">Ghi chú khẩn cấp</Label>
                  <Textarea id="el-emerg" rows={2} value={form.emergencyNotes} onChange={(e) => set("emergencyNotes")(e.target.value)} />
                </div>
              </div>
            </form>
          </>
        )}
        <DialogFooter className="sm:justify-between">
          <Button variant={detail?.isActive === false ? "outline" : "destructive"} onClick={toggleActive} disabled={!detail || toggling}>
            {toggling && <Loader2 className="animate-spin" />}
            {detail?.isActive === false ? "Kích hoạt lại" : "Vô hiệu hóa hồ sơ"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Đóng</Button>
            <Button type="submit" form="elderly-edit-form" disabled={saving || !form}>
              {saving && <Loader2 className="animate-spin" />}
              Lưu hồ sơ
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ElderlyEditDialog;
