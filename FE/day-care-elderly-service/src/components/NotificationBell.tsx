import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Pill } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import notificationService from "../services/notificationService";
import type { NotificationItem } from "../services/notificationService";
import { formatDateTimeVN } from "../lib/date";

/** Job nhắc thuốc ở BE chạy mỗi phút → poll cùng nhịp */
const POLL_MS = 60_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationService.getMine(false, 30);
      if (res.success && res.data) {
        setItems(res.data.items);
        setUnread(res.data.unreadCount);
      }
    } catch {
      // im lặng: lỗi mạng tạm thời không nên làm phiền người dùng
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const markRead = async (n: NotificationItem) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x.notificationId === n.notificationId ? { ...x, isRead: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationService.markRead(n.notificationId);
    } catch {
      load();
    }
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" title="Thông báo" aria-label="Thông báo" />
        }
      >
        <Bell />
        {unread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none"
          >
            {unread > 99 ? "99+" : unread}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Thông báo</p>
          <Button variant="ghost" size="xs" disabled={unread === 0} onClick={markAll}>
            <CheckCheck /> Đọc tất cả
          </Button>
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Đang tải...</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Chưa có thông báo nào.</p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.notificationId}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    className={`flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted ${n.isRead ? "" : "bg-primary/5"}`}
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">
                      {n.notificationType === "MedicationDue" ? <Pill className="size-4 text-emerald-600" /> : <Bell className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className={`text-sm ${n.isRead ? "" : "font-semibold"}`}>{n.title}</span>
                        {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="block text-xs text-muted-foreground">{n.message}</span>
                      <span className="block text-[11px] text-muted-foreground/80">{formatDateTimeVN(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
