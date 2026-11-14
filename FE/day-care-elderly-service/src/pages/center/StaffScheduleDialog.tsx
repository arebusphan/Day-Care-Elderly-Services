import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import centerStaffService from "../../services/centerStaffService";
import type { CenterStaff, StaffSchedule } from "../../services/centerStaffService";
import { formatDateVN, localToday } from "../../lib/date";

interface Props {
  staff: CenterStaff | null;
  onClose: () => void;
  /** Gọi lại khi lịch thay đổi để danh sách NV cập nhật trạng thái hôm nay */
  onChanged: () => void;
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function StaffScheduleDialog({ staff, onClose, onChanged }: Props) {
  const today = localToday();
  const [schedules, setSchedules] = useState<StaffSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [workDate, setWorkDate] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!staff) return;
    setSchedules([]);
    setWorkDate("");
    setIsWorking(false);
    setNote("");
    setFormError(null);
    setLoading(true);
    centerStaffService
      .getSchedules(staff.userId)
      .then((res) => {
        if (res.success && res.data) setSchedules(sortDesc(res.data));
        else setFormError(res.message || "Không thể tải lịch làm việc.");
      })
      .catch((err) => setFormError(errMsg(err, "Lỗi kết nối máy chủ khi tải lịch làm việc.")))
      .finally(() => setLoading(false));
  }, [staff]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setFormError(null);
    if (!workDate) return setFormError("Vui lòng chọn ngày.");
    if (workDate < today) return setFormError("Không thể đặt lịch cho ngày đã qua.");
    if (new Date(workDate + "T00:00:00").getDay() === 0)
      return setFormError("Không thể đặt lịch vào Chủ nhật (trung tâm nghỉ cố định).");

    setSaving(true);
    try {
      const res = await centerStaffService.setSchedule(staff.userId, {
        workDate,
        isWorking,
        note: note.trim() || undefined,
      });
      if (res.success && res.data) {
        const saved = res.data;
        // BE upsert theo ngày → thay bản ghi cùng ngày nếu đã có
        setSchedules((prev) => sortDesc([saved, ...prev.filter((s) => s.workDate !== saved.workDate)]));
        setWorkDate("");
        setNote("");
        toast.success("Đã lưu lịch làm việc.");
        onChanged();
      } else {
        setFormError(res.message || "Không thể lưu lịch.");
      }
    } catch (err) {
      setFormError(errMsg(err, "Lỗi khi lưu lịch."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scheduleId: number) => {
    if (!staff) return;
    setDeletingId(scheduleId);
    try {
      const res = await centerStaffService.deleteSchedule(staff.userId, scheduleId);
      if (res.success) {
        setSchedules((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
        toast.success("Đã xóa lịch.");
        onChanged();
      } else {
        toast.error(res.message || "Không thể xóa lịch.");
      }
    } catch (err) {
      toast.error(errMsg(err, "Lỗi khi xóa lịch."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={!!staff} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-4 text-emerald-600" />
            Lịch làm việc: {staff?.fullName}
          </DialogTitle>
          <DialogDescription>
            {staff?.email} · Ngày đánh dấu "Nghỉ" sẽ bị loại khi xếp ca.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3 rounded-lg border bg-muted/40 p-4">
          {formError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-date">Ngày *</Label>
              <Input
                id="schedule-date"
                type="date"
                min={today}
                value={workDate}
                onChange={(e) => {
                  setWorkDate(e.target.value);
                  setFormError(null);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-note">Ghi chú</Label>
              <Input
                id="schedule-note"
                placeholder="Nghỉ phép, ốm, tăng ca..."
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="flex items-center gap-2 font-normal">
              <Switch checked={isWorking} onCheckedChange={setIsWorking} />
              {isWorking ? "Đi làm" : "Nghỉ"}
            </Label>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              Lưu lịch
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Đã lên lịch ({schedules.length})
          </p>
          {loading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">Đang tải...</p>
          ) : schedules.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
              Chưa có lịch nào.
            </p>
          ) : (
            <ScrollArea className="max-h-72 rounded-lg border">
              <ul className="divide-y">
                {schedules.map((s) => {
                  const isPast = s.workDate < today;
                  return (
                    <li
                      key={s.scheduleId}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${isPast ? "opacity-60" : ""}`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{formatDateVN(s.workDate)}</span>
                          <Badge variant={s.isWorking ? "secondary" : "destructive"}>
                            {s.isWorking ? "Đi làm" : "Nghỉ"}
                          </Badge>
                          {s.workDate === today && <Badge variant="outline">Hôm nay</Badge>}
                          {isPast && <Badge variant="ghost">Đã qua</Badge>}
                        </div>
                        {s.note && <p className="truncate text-xs text-muted-foreground">{s.note}</p>}
                      </div>
                      {!isPast && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xóa lịch"
                          disabled={deletingId === s.scheduleId}
                          onClick={() => handleDelete(s.scheduleId)}
                        >
                          {deletingId === s.scheduleId ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 className="text-destructive" />
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function sortDesc(list: StaffSchedule[]) {
  return [...list].sort((a, b) => b.workDate.localeCompare(a.workDate));
}

export default StaffScheduleDialog;
