import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import attendanceService from "../../services/attendanceService";
import type { PickupPerson } from "../../services/attendanceService";

interface Props {
  person: { elderlyId: number; fullName: string } | null;
  onClose: () => void;
  onDone: () => void;
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** BR-30: check-out phải đối chiếu người đón trong danh sách + 4 số cuối CCCD */
export function CheckoutDialog({ person, onClose, onDone }: Props) {
  const [list, setList] = useState<PickupPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [last4, setLast4] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!person) return;
    setChosen(null);
    setLast4("");
    setOverride(false);
    setReason("");
    setLoading(true);
    attendanceService
      .getPickupPersons(person.elderlyId)
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [person]);

  if (!person) return null;
  const noList = !loading && list.length === 0;

  const submit = async () => {
    if (!noList && !override && (chosen === null || !/^\d{4}$/.test(last4))) {
      return toast.error("Chọn người đón và nhập đúng 4 số cuối CCCD.");
    }
    if (override && !reason.trim()) return toast.error("Nhập lý do giao cho người ngoài danh sách.");
    setSaving(true);
    try {
      await attendanceService.checkOut(
        person.elderlyId,
        noList ? undefined : override ? { overrideReason: reason.trim() } : { pickupPersonId: chosen!, idCardLast4: last4 },
      );
      toast.success(`Đã check-out ${person.fullName}.`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(errMsg(err, "Không check-out được."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" /> Check-out · {person.fullName}
          </DialogTitle>
          <DialogDescription>Chỉ giao cụ cho người trong danh sách được đón.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Đang tải danh sách người đón...</p>
        ) : noList ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Gia đình chưa đăng ký người được đón. Check-out sẽ được ghi chú lại.
          </p>
        ) : (
          <div className="space-y-3">
            {!override && (
              <>
                <div className="space-y-2">
                  {list.map((p) => (
                    <label
                      key={p.pickupPersonId}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${chosen === p.pickupPersonId ? "border-emerald-500 bg-emerald-50" : ""}`}
                    >
                      <span>
                        <span className="font-medium">{p.fullName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.relationship ?? "Người thân"} · {p.phoneNumber}
                        </span>
                      </span>
                      <input type="radio" name="pickup" checked={chosen === p.pickupPersonId} onChange={() => setChosen(p.pickupPersonId)} />
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last4">4 số cuối CCCD người đón đưa ra</Label>
                  <Input id="last4" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))} />
                </div>
              </>
            )}
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={override} onCheckedChange={(v) => setOverride(!!v)} />
              Người đón không có trong danh sách (ngoại lệ)
            </Label>
            {override && (
              <div className="space-y-1.5">
                <Label htmlFor="override">Lý do & xác nhận đã gọi người liên hệ chính *</Label>
                <Textarea id="override" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                <p className="text-xs text-rose-600">Gia đình và quản lý sẽ nhận cảnh báo ngay.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving || loading}>
            {saving && <Loader2 className="animate-spin" />}
            Xác nhận check-out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CheckoutDialog;
