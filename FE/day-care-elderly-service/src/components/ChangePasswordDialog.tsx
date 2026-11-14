import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "../services/authService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const empty = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const close = (o: boolean) => {
    if (!o) {
      setForm(empty);
      setErrors([]);
    }
    onOpenChange(o);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!form.currentPassword) errs.push("Nhập mật khẩu hiện tại.");
    if (form.newPassword.length < 6) errs.push("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (form.newPassword !== form.confirmNewPassword) errs.push("Xác nhận mật khẩu mới không khớp.");
    if (form.newPassword && form.newPassword === form.currentPassword) errs.push("Mật khẩu mới phải khác mật khẩu hiện tại.");
    setErrors(errs);
    if (errs.length) return;

    setSaving(true);
    try {
      const res = await authService.changePassword(form);
      if (res.success) {
        toast.success(res.message || "Đã đổi mật khẩu.");
        close(false);
      } else {
        setErrors(res.errors?.length ? res.errors : [res.message || "Không đổi được mật khẩu."]);
      }
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string; errors?: string[] } } })?.response?.data;
      setErrors(data?.errors?.length ? data.errors : [data?.message || "Không đổi được mật khẩu."]);
    } finally {
      setSaving(false);
    }
  };

  const field = (id: keyof typeof empty, label: string, autoComplete: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`pw-${id}`}>{label}</Label>
      <Input
        id={`pw-${id}`}
        type="password"
        autoComplete={autoComplete}
        value={form[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>Mật khẩu mới tối thiểu 6 ký tự.</DialogDescription>
        </DialogHeader>
        <form id="change-pw-form" onSubmit={submit} className="grid gap-3">
          {errors.length > 0 && (
            <ul className="list-inside list-disc rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errors.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          {field("currentPassword", "Mật khẩu hiện tại", "current-password")}
          {field("newPassword", "Mật khẩu mới", "new-password")}
          {field("confirmNewPassword", "Nhập lại mật khẩu mới", "new-password")}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Hủy
          </Button>
          <Button type="submit" form="change-pw-form" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Đổi mật khẩu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ChangePasswordDialog;
