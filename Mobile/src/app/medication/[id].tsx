import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { Badge, Button, Card, colors, Empty, Field, Loading, Notice, s } from "@/components/ui";
import { today } from "@/lib/api";
import { staffMoreApi } from "@/lib/services2";
import type { MedicationPlan } from "@/lib/types2";

type Form = { id: number | null; name: string; dosage: string; instructions: string; times: string; startDate: string; endDate: string; active: boolean };
const emptyForm = (): Form => ({ id: null, name: "", dosage: "", instructions: "", times: "08:00", startDate: today(), endDate: "", active: true });
const parseTimes = (v: string) => v.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
const validTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

/** Staff › Kế hoạch thuốc của 1 cụ: xem, thêm, sửa, sinh lịch liều */
export default function MedicationPlans() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const elderlyId = Number(id);
  const [plans, setPlans] = useState<MedicationPlan[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try { setPlans(await staffMoreApi.plans(elderlyId)); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được kế hoạch thuốc."); setPlans([]); }
  }, [elderlyId]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form) return;
    const times = parseTimes(form.times);
    if (!form.name.trim() || !form.dosage.trim()) { setError("Nhập tên thuốc và liều dùng."); return; }
    if (times.length === 0 || !times.every(validTime)) { setError("Giờ uống dạng HH:mm, cách nhau dấu phẩy (vd 08:00, 20:00)."); return; }
    if (!validDate(form.startDate) || (form.endDate && !validDate(form.endDate))) { setError("Ngày dạng YYYY-MM-DD."); return; }
    setSaving(true); setError(""); setNotice("");
    const body = { medicationName: form.name.trim(), dosage: form.dosage.trim(), instructions: form.instructions.trim() || undefined, scheduleTimes: times, startDate: form.startDate, endDate: form.endDate || null, isActive: form.active };
    try {
      if (form.id === null) await staffMoreApi.createPlan(elderlyId, { ...body, generateDays: 14 });
      else await staffMoreApi.updatePlan(form.id, body);
      setNotice(form.id === null ? "Đã thêm kế hoạch thuốc và sinh lịch liều 14 ngày." : "Đã cập nhật kế hoạch thuốc.");
      setForm(null); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Không lưu được."); }
    finally { setSaving(false); }
  };

  const generate = async (p: MedicationPlan) => {
    setError(""); setNotice("");
    try { const r = await staffMoreApi.generateDoses(p.medicationPlanId, p.scheduleTimes); setNotice(`Đã sinh ${r.createdCount} liều mới (bỏ qua ${r.skippedExistingCount} liều đã có).`); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Không sinh được lịch liều."); }
  };

  return (
    <>
      <Stack.Screen options={{ title: name ? `Thuốc · ${name}` : "Kế hoạch thuốc" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        {!!error && <Notice text={error} tone="error" />}
        {!!notice && <Notice text={notice} />}
        {form ? (
          <Card>
            <Text style={[s.title, { marginBottom: 10 }]}>{form.id === null ? "Thêm kế hoạch thuốc" : "Sửa kế hoạch thuốc"}</Text>
            <Field label="Tên thuốc" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <Field label="Liều dùng (vd 1 viên)" value={form.dosage} onChangeText={(v) => setForm({ ...form, dosage: v })} />
            <Field label="Hướng dẫn (vd uống sau ăn)" value={form.instructions} onChangeText={(v) => setForm({ ...form, instructions: v })} />
            <Field label="Giờ uống (cách nhau dấu phẩy)" value={form.times} onChangeText={(v) => setForm({ ...form, times: v })} placeholder="08:00, 20:00" />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Từ ngày" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} placeholder="YYYY-MM-DD" /></View>
              <View style={{ flex: 1 }}><Field label="Đến ngày (trống = dài hạn)" value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} placeholder="YYYY-MM-DD" /></View>
            </View>
            <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
              <Text>Đang dùng</Text>
              <Switch value={form.active} onValueChange={(v) => setForm({ ...form, active: v })} />
            </View>
            <View style={s.row}>
              <Button title="Hủy" variant="outline" onPress={() => setForm(null)} style={{ flex: 1 }} />
              <Button title="Lưu" onPress={() => void save()} loading={saving} style={{ flex: 2 }} />
            </View>
          </Card>
        ) : <Button title="+ Thêm kế hoạch thuốc" onPress={() => { setNotice(""); setForm(emptyForm()); }} style={{ marginBottom: 12 }} />}

        {plans === null ? <Loading /> : plans.length === 0 ? <Empty text="Chưa có kế hoạch thuốc." /> : plans.map((p) => (
          <Card key={p.medicationPlanId} style={{ padding: 12, opacity: p.isActive ? 1 : 0.6 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{p.medicationName} · {p.dosage}</Text>
              <Badge text={p.isActive ? "Đang dùng" : "Ngừng"} tone={p.isActive ? "green" : "gray"} />
            </View>
            <Text style={s.muted}>Giờ uống: {p.scheduleTimes.join(", ")}{p.instructions ? ` · ${p.instructions}` : ""}</Text>
            <Text style={s.muted}>Từ {p.startDate}{p.endDate ? ` đến ${p.endDate}` : " (dài hạn)"} · {p.pendingDoseCount} liều chờ</Text>
            <View style={[s.row, { marginTop: 8 }]}>
              <Button small variant="outline" title="Sửa" onPress={() => { setNotice(""); setForm({ id: p.medicationPlanId, name: p.medicationName, dosage: p.dosage, instructions: p.instructions ?? "", times: p.scheduleTimes.join(", "), startDate: p.startDate, endDate: p.endDate ?? "", active: p.isActive }); }} />
              {p.isActive && <Button small variant="outline" title="Sinh lịch liều" onPress={() => void generate(p)} />}
            </View>
          </Card>
        ))}
      </ScrollView>
    </>
  );
}
