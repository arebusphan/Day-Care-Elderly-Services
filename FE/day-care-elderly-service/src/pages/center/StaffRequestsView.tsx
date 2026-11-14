import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, FileText, X } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import staffRequestService, { REQUEST_STATUS_LABEL, REQUEST_TYPE_LABEL } from "../../services/staffRequestService";
import type { StaffRequest } from "../../services/staffRequestService";
import { formatDateTimeVN, formatDateVN } from "../../lib/date";

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** SRS 3.10.2: Manager duyệt đơn nghỉ / đổi ca; duyệt sẽ cập nhật lịch làm việc và nhóm đã phân */
export function StaffRequestsView() {
  const [status, setStatus] = useState("Pending");
  const [items, setItems] = useState<StaffRequest[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await staffRequestService.all(status === "all" ? undefined : status);
      setItems(res.data ?? []);
    } catch (err) {
      toast.error(errMsg(err, "Không tải được danh sách đơn."));
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (r: StaffRequest, approve: boolean) => {
    setBusy(r.requestId);
    try {
      const res = await staffRequestService.review(r.requestId, approve, notes[r.requestId]);
      if (!res.success) throw new Error(res.message);
      toast.success(res.message);
      load();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không xử lý được đơn."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileText className="size-4 text-emerald-600" /> Đơn nghỉ / đổi ca</CardTitle>
        <CardDescription>Duyệt đơn sẽ cập nhật lịch làm việc; đổi ca tự chuyển nhóm đã phân sang người làm thay.</CardDescription>
        <CardAction>
          <Tabs value={status} onValueChange={(v) => setStatus(v as string)}>
            <TabsList>
              <TabsTrigger value="Pending">Chờ duyệt</TabsTrigger>
              <TabsTrigger value="Approved">Đã duyệt</TabsTrigger>
              <TabsTrigger value="Rejected">Từ chối</TabsTrigger>
              <TabsTrigger value="all">Tất cả</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Loại / ngày</TableHead>
              <TableHead>Lý do</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Xử lý</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Không có đơn.</TableCell></TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.requestId}>
                  <TableCell>
                    <p className="font-medium">{r.staffName}</p>
                    <p className="text-xs text-muted-foreground">Gửi {formatDateTimeVN(r.createdAt)}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {REQUEST_TYPE_LABEL[r.requestType]} · {formatDateVN(r.requestDate)}
                    {r.swapWithStaffName && <span className="block text-xs text-muted-foreground">Làm thay: {r.swapWithStaffName}</span>}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal text-xs">{r.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "Approved" ? "secondary" : r.status === "Rejected" ? "destructive" : "outline"}>{REQUEST_STATUS_LABEL[r.status]}</Badge>
                    {r.reviewerName && <p className="text-[11px] text-muted-foreground">{r.reviewerName}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "Pending" ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          className="h-8 w-40"
                          placeholder="Ghi chú"
                          value={notes[r.requestId] ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [r.requestId]: e.target.value }))}
                        />
                        <Button size="sm" disabled={busy === r.requestId} onClick={() => review(r, true)}><Check /> Duyệt</Button>
                        <Button size="sm" variant="outline" disabled={busy === r.requestId} onClick={() => review(r, false)}><X /> Từ chối</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.reviewNote ?? ""}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default StaffRequestsView;
