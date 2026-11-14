import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserCog } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import centerProfileService from "../../services/centerProfileService";

interface Props {
  userId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data?.errors?.join(" ") ||
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
  fallback;

/** F-04: Manager xem và cập nhật hồ sơ nhân viên (chức vụ, chứng chỉ, ngày vào làm) */
export function StaffProfileDialog({ userId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ fullName: "", phoneNumber: "", position: "", qualification: "", startDate: "" });

  useEffect(() => {
    if (userId === null) return;
    setLoading(true);
    centerProfileService
      .getStaffProfile(userId)
      .then((res) => {
        const p = res.data;
        if (!p) return;
        setEmail(p.email);
        setForm({
          fullName: p.fullName,
          phoneNumber: p.phoneNumber ?? "",
          position: p.position ?? "",
          qualification: p.qualification ?? "",
          startDate: p.startDate ?? "",
        });
      })
      .catch((err) => toast.error(errMsg(err, "Không tải được hồ sơ nhân viên.")))
      .finally(() => setLoading(false));
  }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userId === null) return;
    if (!form.fullName.trim()) return toast.error("Nhập họ tên.");
    setSaving(true);
    try {
      const res = await centerProfileService.updateStaffProfile(userId, {
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
        position: form.position.trim() || null,
        qualification: form.qualification.trim() || null,
        startDate: form.startDate || null,
      });
      if (!res.success) throw new Error(res.message);
      toast.success("Đã cập nhật hồ sơ nhân viên.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không lưu được hồ sơ."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={userId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="size-4 text-emerald-600" /> Hồ sơ nhân viên
          </DialogTitle>
          <DialogDescription>{email}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <form id="staff-profile-form" onSubmit={save} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sp-name">Họ tên *</Label>
                <Input id="sp-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-phone">Số điện thoại</Label>
                <Input id="sp-phone" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-position">Chức vụ</Label>
                <Input id="sp-position" placeholder="Điều dưỡng, Hộ lý..." value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-start">Ngày vào làm</Label>
                <Input id="sp-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-qual">Chứng chỉ / bằng cấp</Label>
              <Textarea id="sp-qual" rows={2} value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
            </div>
          </form>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" form="staff-profile-form" disabled={saving || loading}>
            {saving && <Loader2 className="animate-spin" />}
            Lưu hồ sơ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StaffProfileDialog;
