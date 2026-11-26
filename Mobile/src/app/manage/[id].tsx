import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Chips, colors, Empty, Field, Loading, Notice, s, Segments } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { timeLabel } from "@/lib/api";
import { familyMoreApi } from "@/lib/services2";
import type { AbsenceReport, AttendanceRecord, PickupPersonFull } from "@/lib/types2";

type Tab = "pickup" | "absence" | "history";
type PickupForm = { id: number | null; fullName: string; relationship: string; phoneNumber: string; idCardLast4: string };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayLabel = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
const attendanceLabels: Record<string, string> = { Present: "Có mặt", CheckedIn: "Có mặt", CheckedOut: "Đã về", Left: "Đã về", Absent: "Vắng" };

/** Gia đình › Người được đón, báo vắng, lịch sử điểm danh của 1 người thân */
export default function Manage() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const elderlyId = Number(id);
  const [tab, setTab] = useState<Tab>("pickup");
  const [pickups, setPickups] = useState<PickupPersonFull[] | null>(null);
  const [absences, setAbsences] = useState<AbsenceReport[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [form, setForm] = useState<PickupForm | null>(null);
  const [absDate, setAbsDate] = useState("");
  const [absReason, setAbsReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [remove, setRemove] = useState<{ kind: "pickup" | "absence"; id: number; label: string } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [p, a, h] = await Promise.all([
        familyMoreApi.pickupPersons(elderlyId), familyMoreApi.absences(), familyMoreApi.attendanceHistory(elderlyId).catch(() => [] as AttendanceRecord[]),
      ]);
      setPickups(p); setAbsences(a.filter((x) => x.elderlyId === elderlyId)); setHistory(h);
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được dữ liệu."); setPickups([]); }
  }, [elderlyId]);
  useEffect(() => { void load(); }, [load]);

  const savePickup = async () => {
    if (!form) return;
    if (!form.fullName.trim() || !/^0\d{9}$/.test(form.phoneNumber.trim()) || !/^\d{4}$/.test(form.idCardLast4.trim())) {
      setError("Nhập họ tên, SĐT 10 số (bắt đầu 0) và 4 số cuối CCCD."); return;
    }
    setSaving(true); setError(""); setNotice("");
    const body = { fullName: form.fullName.trim(), relationship: form.relationship.trim() || null, phoneNumber: form.phoneNumber.trim(), idCardLast4: form.idCardLast4.trim() };
    try {
      if (form.id === null) await familyMoreApi.addPickup(elderlyId, body); else await familyMoreApi.updatePickup(form.id, body);
      setNotice("Đã lưu người được đón."); setForm(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không lưu được."); }
    finally { setSaving(false); }
  };

  const reportAbsence = async () => {
    if (!absDate) { setError("Chọn ngày vắng."); return; }
    setSaving(true); setError(""); setNotice("");
    try { await familyMoreApi.reportAbsence(elderlyId, absDate, absReason.trim() || undefined); setNotice("Đã báo vắng. Ngày vắng không được hoàn tiền."); setAbsDate(""); setAbsReason(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Không báo vắng được."); }
    finally { setSaving(false); }
  };

  // 14 ngày tới, bỏ Chủ nhật và ngày đã báo
  const nextDays = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; })
    .filter((d) => d.getDay() !== 0).map(iso).filter((d) => !absences.some((a) => a.absenceDate.slice(0, 10) === d));

  return (
    <>
      <Stack.Screen options={{ title: name ?? "Đón, vắng & điểm danh" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Segments value={tab} onChange={(t) => { setTab(t); setError(""); setNotice(""); }} items={[
          { value: "pickup", label: "Người đón" }, { value: "absence", label: "Báo vắng" }, { value: "history", label: "Điểm danh" },
        ]} />
        <View style={{ height: 12 }} />
        {!!error && <Notice text={error} tone="error" />}
        {!!notice && <Notice text={notice} />}
        {pickups === null ? <Loading /> : tab === "pickup" ? (
          <>
            <Text style={[s.muted, { marginBottom: 10 }]}>Nhân viên chỉ giao cụ cho người trong danh sách, đối chiếu 4 số cuối CCCD.</Text>
            {form ? (
              <Card>
                <Field label="Họ tên" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} />
                <Field label="Quan hệ (vd con trai)" value={form.relationship} onChangeText={(v) => setForm({ ...form, relationship: v })} />
                <Field label="Số điện thoại" value={form.phoneNumber} onChangeText={(v) => setForm({ ...form, phoneNumber: v })} keyboardType="phone-pad" />
                <Field label="4 số cuối CCCD" value={form.idCardLast4} onChangeText={(v) => setForm({ ...form, idCardLast4: v })} keyboardType="number-pad" maxLength={4} />
                <View style={s.row}>
                  <Button title="Hủy" variant="outline" onPress={() => setForm(null)} style={{ flex: 1 }} />
                  <Button title="Lưu" onPress={() => void savePickup()} loading={saving} style={{ flex: 2 }} />
                </View>
              </Card>
            ) : <Button title="+ Thêm người được đón" onPress={() => setForm({ id: null, fullName: "", relationship: "", phoneNumber: "", idCardLast4: "" })} style={{ marginBottom: 12 }} />}
            {pickups.length === 0 ? <Empty text="Chưa có người được đón." /> : pickups.map((p) => (
              <Card key={p.pickupPersonId} style={{ padding: 12 }}>
                <Text style={{ fontWeight: "700", color: colors.text }}>{p.fullName}{p.relationship ? ` · ${p.relationship}` : ""}</Text>
                <Text style={s.muted}>{p.phoneNumber} · CCCD ••••{p.idCardLast4}</Text>
                <View style={[s.row, { marginTop: 8 }]}>
                  <Button small variant="outline" title="Sửa" onPress={() => setForm({ id: p.pickupPersonId, fullName: p.fullName, relationship: p.relationship ?? "", phoneNumber: p.phoneNumber, idCardLast4: p.idCardLast4 })} />
                  <Button small variant="danger" title="Xóa" onPress={() => setRemove({ kind: "pickup", id: p.pickupPersonId, label: p.fullName })} />
                </View>
              </Card>
            ))}
          </>
        ) : tab === "absence" ? (
          <>
            <Card>
              <Text style={[s.title, { marginBottom: 6 }]}>Báo vắng</Text>
              <Text style={[s.muted, { marginBottom: 10 }]}>Ngày vắng vẫn tính phí theo gói (không hoàn tiền).</Text>
              <Text style={s.label}>Ngày</Text>
              <Chips value={absDate} onChange={setAbsDate} options={nextDays.map((d) => ({ value: d, label: dayLabel(d) }))} />
              <Field label="Lý do" value={absReason} onChangeText={setAbsReason} />
              <Button title="Gửi báo vắng" onPress={() => void reportAbsence()} loading={saving} />
            </Card>
            {absences.length === 0 ? <Empty text="Chưa báo vắng ngày nào." /> : absences.map((a) => (
              <Card key={a.absenceId} style={{ padding: 12 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", color: colors.text }}>{dayLabel(a.absenceDate)}</Text>
                  {a.absenceDate.slice(0, 10) >= iso(new Date()) && <Button small variant="outline" title="Hủy" onPress={() => setRemove({ kind: "absence", id: a.absenceId, label: dayLabel(a.absenceDate) })} />}
                </View>
                {!!a.reason && <Text style={s.muted}>{a.reason}</Text>}
              </Card>
            ))}
          </>
        ) : history.length === 0 ? <Empty text="Chưa có lịch sử điểm danh." /> : history.map((h) => (
          <Card key={h.attendanceId} style={{ padding: 12 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text }}>{dayLabel(h.attendanceDate)}</Text>
              <Badge text={attendanceLabels[h.status] ?? h.status} tone={h.status === "Absent" ? "red" : "green"} />
            </View>
            <Text style={s.muted}>{h.checkInAt ? `Đến ${timeLabel(h.checkInAt)}` : "—"}{h.checkOutAt ? ` · Về ${timeLabel(h.checkOutAt)}` : ""}</Text>
          </Card>
        ))}
      </ScrollView>
      <Sheet visible={!!remove} title={remove?.kind === "pickup" ? `Xóa ${remove.label} khỏi danh sách đón?` : `Hủy báo vắng ${remove?.label ?? ""}?`} confirmText="Xác nhận" danger
        onCancel={() => setRemove(null)} onConfirm={async () => {
          if (!remove) return;
          if (remove.kind === "pickup") await familyMoreApi.removePickup(remove.id); else await familyMoreApi.cancelAbsence(remove.id);
          setRemove(null); await load();
        }} />
    </>
  );
}
