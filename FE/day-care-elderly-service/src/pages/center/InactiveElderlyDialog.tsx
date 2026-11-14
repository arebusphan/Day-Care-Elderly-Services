import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import centerProfileService from "../../services/centerProfileService";
import type { InactiveElderly } from "../../services/centerProfileService";

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Danh sách hồ sơ đã vô hiệu hóa (xóa mềm) — kích hoạt lại */
export function InactiveElderlyDialog({ open, onClose, onChanged }: Props) {
  const [items, setItems] = useState<InactiveElderly[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () =>
    centerProfileService
      .getInactiveElderly()
      .then((r) => setItems(r.data ?? []))
      .catch(() => setItems([]));

  useEffect(() => {
    if (open) load();
  }, [open]);

  const reactivate = async (e: InactiveElderly) => {
    setBusyId(e.elderlyId);
    try {
      const res = await centerProfileService.setElderlyActive(e.elderlyId, true);
      if (!res.success) throw new Error(res.message);
      toast.success(`Đã kích hoạt lại ${e.fullName}.`);
      await load();
      onChanged();
    } catch (err) {
      toast.error((err as Error)?.message || "Không kích hoạt được.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hồ sơ đã vô hiệu hóa</DialogTitle>
          <DialogDescription>Lịch sử chăm sóc của các hồ sơ này vẫn được giữ lại.</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Không có hồ sơ nào.</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border text-sm">
            {items.map((e) => (
              <li key={e.elderlyId} className="flex items-center justify-between px-3 py-2">
                <span>
                  {e.fullName}
                  <span className="block text-xs text-muted-foreground">ELD-{String(e.elderlyId).padStart(4, "0")}</span>
                </span>
                <Button variant="outline" size="sm" disabled={busyId === e.elderlyId} onClick={() => reactivate(e)}>
                  <RotateCcw /> Kích hoạt lại
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InactiveElderlyDialog;
