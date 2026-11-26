import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Chips, colors, Empty, Field, Loading, Notice, s, Segments } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { staffMoreApi } from "@/lib/services2";
import { availabilityLabels, requestStatusLabels, requestTypeLabels, type MyScheduleDay, type StaffRequest, type StaffRequestType } from "@/lib/types2";

const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });

/** Staff › Lịch làm việc 14 ngày + đơn xin nghỉ / đổi ca */
export default function MySchedule() {
  const [tab, setTab] = useState<"schedule" | "requests">("schedule");
  const [days, setDays] = useState<MyScheduleDay[] | null>(null);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [colleagues, setColleagues] = useState<{ userId: number; fullName: string }[]>([]);
  const [type, setType] = useState<StaffRequestType>("Leave");
  const [date, setDate] = useState("");
  const [swapWith, setSwapWith] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancelId, setCancelId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [d, r, c] = await Promise.all([staffMoreApi.mySchedule(14), staffMoreApi.myRequests(), staffMoreApi.colleagues().catch(() => [])]);
      setDays(d); setRequests(r); setColleagues(c);
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được lịch."); setDays([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!date) { setError("Chọn ngày."); return; }
    if (type === "ShiftChange" && !swapWith) { setError("Chọn đồng nghiệp đổi ca."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      await staffMoreApi.createRequest({ requestType: type, requestDate: date, swapWithStaffId: type === "ShiftChange" ? Number(swapWith) : null, reason: reason.trim() || undefined });
      setNotice("Đã gửi đơn, chờ quản lý duyệt."); setDate(""); setSwapWith(""); setReason(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không gửi được đơn."); }
    finally { setSaving(false); }
  };

  const workDays = (days ?? []).filter((d) => !d.isSunday);
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Segments value={tab} onChange={setTab} items={[{ value: "schedule", label: "Lịch 14 ngày" }, { value: "requests", label: `Đơn của tôi ${requests.length}` }]} />
        <View style={{ height: 12 }} />
        {!!error && <Notice text={error} tone="error" />}
        {!!notice && <Notice text={notice} />}
        {days === null ? <Loading /> : tab === "schedule" ? days.map((d) => (
          <Card key={d.date} style={{ padding: 12, opacity: d.isSunday ? 0.6 : 1 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{dayLabel(d.date)}</Text>
              <Badge text={availabilityLabels[d.availability]} tone={d.availability === "Working" ? "green" : d.availability === "Closed" ? "gray" : "orange"} />
            </View>
            {d.group ? <Text style={s.muted}>{d.group.groupName} · {d.group.members} cụ · {d.group.planStatus === "Published" ? "đã công bố" : "nháp"}</Text> : !d.isSunday && <Text style={s.muted}>Chưa phân nhóm</Text>}
            {!!d.note && <Text style={s.muted}>{d.note}</Text>}
            {d.requests.map((r) => {
              const [t, st] = r.split(":") as [StaffRequestType, StaffRequest["status"]];
              return <Text key={r} style={{ color: colors.warn, fontSize: 13 }}>Đơn {requestTypeLabels[t]?.toLowerCase() ?? t} · {requestStatusLabels[st]?.toLowerCase() ?? st}</Text>;
            })}
          </Card>
        )) : (
          <>
            <Card>
              <Text style={[s.title, { marginBottom: 10 }]}>Tạo đơn</Text>
              <Chips value={type} onChange={setType} options={[{ value: "Leave", label: "Xin nghỉ" }, { value: "ShiftChange", label: "Đổi ca" }]} />
              <Text style={s.label}>Ngày</Text>
              <Chips value={date} onChange={setDate} options={workDays.map((d) => ({ value: d.date, label: dayLabel(d.date) }))} />
              {type === "ShiftChange" && (
                <>
                  <Text style={s.label}>Đổi ca với</Text>
                  {colleagues.length === 0 ? <Text style={[s.muted, { marginBottom: 12 }]}>Không có đồng nghiệp.</Text> : <Chips value={swapWith} onChange={setSwapWith} options={colleagues.map((c) => ({ value: String(c.userId), label: c.fullName }))} />}
                </>
              )}
              <Field label="Lý do" value={reason} onChangeText={setReason} multiline />
              <Button title="Gửi đơn" onPress={() => void submit()} loading={saving} />
            </Card>
            {requests.length === 0 ? <Empty text="Chưa có đơn nào." /> : requests.map((r) => (
              <Card key={r.requestId} style={{ padding: 12 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{requestTypeLabels[r.requestType]} · {dayLabel(r.requestDate.slice(0, 10))}</Text>
                  <Badge text={requestStatusLabels[r.status]} tone={r.status === "Approved" ? "green" : r.status === "Rejected" ? "red" : "orange"} />
                </View>
                {!!r.swapWithStaffName && <Text style={s.muted}>Đổi với {r.swapWithStaffName}</Text>}
                {!!r.reason && <Text style={s.muted}>Lý do: {r.reason}</Text>}
                {!!r.reviewNote && <Text style={s.muted}>Quản lý: {r.reviewNote}</Text>}
                {r.status === "Pending" && <Button small variant="outline" title="Hủy đơn" onPress={() => setCancelId(r.requestId)} style={{ marginTop: 8, alignSelf: "flex-start" }} />}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <Sheet visible={cancelId !== null} title="Hủy đơn này?" confirmText="Hủy đơn" danger onCancel={() => setCancelId(null)} onConfirm={async () => {
        if (cancelId === null) return;
        await staffMoreApi.cancelRequest(cancelId); setCancelId(null); setNotice("Đã hủy đơn."); await load();
      }} />
    </>
  );
}
