import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Card, Chips, colors, Empty, Loading, Notice, s, Segments } from "@/components/ui";
import { familyMoreApi } from "@/lib/services2";
import { money, type ElderlyProfile, type RegistrationResult, type ServicePackage } from "@/lib/types2";

type RegType = "monthly" | "daily";
type Pattern = "all" | "mwf" | "tts";
const patternDays: Record<Pattern, number[]> = { all: [1, 2, 3, 4, 5, 6], mwf: [1, 3, 5], tts: [2, 4, 6] };
const patternLabels: Record<Pattern, string> = { all: "Cả tuần (T2–T7)", mwf: "T2 · T4 · T6", tts: "T3 · T5 · T7" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (v: string) => new Date(`${v}T00:00:00`);
const dayLabel = (v: string) => parse(v).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
const upcoming = (n: number) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }).filter((d) => d.getDay() !== 0).map(iso);
const monthEnd = (start: string) => { const e = parse(start); e.setMonth(e.getMonth() + 1); e.setDate(e.getDate() - 1); return iso(e); };
const datesIn = (start: string, end: string, days: number[]) => {
  const out: string[] = []; const d = parse(start); const last = parse(end);
  while (d <= last) { if (days.includes(d.getDay())) out.push(iso(d)); d.setDate(d.getDate() + 1); }
  return out;
};

/** Cùng công thức với BE PackagePricing (server kiểm tra lại tổng tiền) */
function quote(pkg: ServicePackage, elderly: ElderlyProfile, type: RegType, pattern: Pattern, days: number, room: "large" | "small") {
  const basic = pkg.packageName.toLowerCase().includes("cơ bản");
  const endOfLife = pkg.endOfLifeRoomIncluded || pkg.packageName.toLowerCase().includes("giai đoạn cuối");
  const support = basic && (elderly.mobilityStatus === "Support" || elderly.mobilityStatus === "Cần hỗ trợ");
  const small = room === "small" && !endOfLife;
  if (type === "daily") return { packagePrice: pkg.pricePerDay * days, supportSurcharge: support ? 75000 * days : 0, roomSurcharge: small ? 60000 * days : 0 };
  const full = pattern === "all";
  return {
    packagePrice: full ? pkg.priceMonthFullWeek : pkg.priceMonth3Days,
    supportSurcharge: support ? (full ? 1500000 : 825000) : 0,
    roomSurcharge: small ? (full ? 1200000 : 660000) : 0,
  };
}

/** Gia đình › Đăng ký gói dịch vụ cho người thân */
export default function Register() {
  const { packageId } = useLocalSearchParams<{ packageId: string }>();
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [people, setPeople] = useState<ElderlyProfile[] | null>(null);
  const [elderlyId, setElderlyId] = useState("");
  const [type, setType] = useState<RegType>("monthly");
  const [pattern, setPattern] = useState<Pattern>("all");
  const [start, setStart] = useState(upcoming(7)[0]);
  const [picked, setPicked] = useState<string[]>([]);
  const [room, setRoom] = useState<"large" | "small">("large");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([familyMoreApi.packages(), familyMoreApi.profiles()]).then(([pk, pr]) => {
      setPkg(pk.find((p) => String(p.packageId) === packageId) ?? null);
      const active = pr.filter((p) => p.isActive !== false);
      setPeople(active); if (active.length > 0) setElderlyId(String(active[0].elderlyId));
    }).catch((err) => { setError(err instanceof Error ? err.message : "Không tải được dữ liệu."); setPeople([]); });
  }, [packageId]);

  const elderly = people?.find((p) => String(p.elderlyId) === elderlyId) ?? null;
  const end = type === "monthly" ? monthEnd(start) : picked[picked.length - 1] ?? "";
  const dates = useMemo(() => (type === "monthly" ? datesIn(start, monthEnd(start), patternDays[pattern]) : [...picked].sort()), [type, start, pattern, picked]);
  const q = pkg && elderly && dates.length > 0 ? quote(pkg, elderly, type, pattern, dates.length, room) : null;
  const total = q ? q.packagePrice + q.supportSurcharge + q.roomSurcharge : 0;

  const submit = async () => {
    if (!pkg || !elderly || !q) return;
    setSaving(true); setError("");
    try {
      const r = await familyMoreApi.register({
        packageId: String(pkg.packageId), elderlyId: elderly.elderlyId, registrationType: type,
        monthlyPattern: type === "monthly" ? pattern : undefined, startDate: dates[0] ?? start, endDate: type === "monthly" ? end : dates[dates.length - 1],
        roomType: room, totalDays: dates.length, ...q, totalAmount: total, selectedDates: dates, paymentMethod: "Chuyển khoản QR (VietQR / VNPay)",
      });
      setResult(r); setConfirm(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Không đăng ký được."); setConfirm(false); }
    finally { setSaving(false); }
  };

  if (people === null) return <Loading />;
  if (!pkg) return <View style={{ padding: 16 }}>{!!error && <Notice text={error} tone="error" />}<Empty text="Không tìm thấy gói dịch vụ." /></View>;
  if (result) return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Text style={[s.title, { color: colors.primary }]}>Đăng ký thành công</Text>
        <Text style={{ color: colors.text, marginTop: 8 }}>Mã đăng ký: {result.registrationCode}</Text>
        <Text style={{ color: colors.text }}>Hóa đơn: {result.invoiceNo}</Text>
        <Text style={{ color: colors.text }}>Tổng tiền: {money(result.totalAmount)}</Text>
      </Card>
      <Button title="Xem hóa đơn" onPress={() => router.replace("/invoices")} style={{ marginBottom: 10 }} />
      <Button title="Về danh sách gói" variant="outline" onPress={() => router.back()} />
    </ScrollView>
  );

  const line = (k: string, v: string, bold = false) => (
    <View key={k} style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}><Text style={s.muted}>{k}</Text><Text style={{ color: colors.text, fontWeight: bold ? "700" : "400" }}>{v}</Text></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[s.title, { marginBottom: 12 }]}>{pkg.packageName}</Text>
      {!!error && <Notice text={error} tone="error" />}
      {people.length === 0 ? <Empty text="Hãy thêm hồ sơ người thân trước khi đăng ký." /> : (
        <>
          <Card>
            <Text style={s.label}>Người thân</Text>
            <Chips value={elderlyId} onChange={setElderlyId} options={people.map((p) => ({ value: String(p.elderlyId), label: p.fullName }))} />
            <Text style={s.label}>Hình thức</Text>
            <Segments value={type} onChange={setType} items={[{ value: "monthly", label: "Theo tháng" }, { value: "daily", label: "Theo ngày" }]} />
            <View style={{ height: 12 }} />
            {type === "monthly" ? (
              <>
                <Text style={s.label}>Lịch đến</Text>
                <Chips value={pattern} onChange={setPattern} options={(Object.keys(patternLabels) as Pattern[]).map((p) => ({ value: p, label: patternLabels[p] }))} />
                <Text style={s.label}>Ngày bắt đầu</Text>
                <Chips value={start} onChange={setStart} options={upcoming(14).map((d) => ({ value: d, label: dayLabel(d) }))} />
                <Text style={s.muted}>Từ {dayLabel(start)} đến {dayLabel(end)} · {dates.length} buổi</Text>
              </>
            ) : (
              <>
                <Text style={s.label}>Chọn ngày (không gồm Chủ nhật)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {upcoming(21).map((d) => {
                    const on = picked.includes(d);
                    return (
                      <Pressable key={d} onPress={() => setPicked(on ? picked.filter((x) => x !== d) : [...picked, d].sort())}
                        style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : "#fff" }}>
                        <Text style={{ color: on ? "#fff" : colors.text, fontSize: 13 }}>{dayLabel(d)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[s.muted, { marginTop: 8 }]}>Đã chọn {picked.length} ngày</Text>
              </>
            )}
            <Text style={[s.label, { marginTop: 12 }]}>Phòng nghỉ trưa</Text>
            <Chips value={room} onChange={setRoom} options={[{ value: "large", label: "Phòng chung" }, { value: "small", label: "Phòng 1–2 người" }]} />
          </Card>
          <Card>
            <Text style={[s.title, { fontSize: 16 }]}>Chi phí</Text>
            {q ? (
              <>
                {line("Giá gói", money(q.packagePrice))}
                {q.supportSurcharge > 0 && line("Phụ phí cần hỗ trợ", money(q.supportSurcharge))}
                {q.roomSurcharge > 0 && line("Phụ phí phòng 1–2 người", money(q.roomSurcharge))}
                {line("Tổng cộng", money(total), true)}
                <Text style={[s.muted, { marginTop: 6 }]}>Ngày vắng không được hoàn tiền.</Text>
              </>
            ) : <Text style={s.muted}>Chọn ngày để xem chi phí.</Text>}
          </Card>
          {confirm ? (
            <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
              <Text style={{ color: colors.text, marginBottom: 10 }}>Xác nhận đăng ký {pkg.packageName} cho {elderly?.fullName}, thanh toán {money(total)}?</Text>
              <View style={s.row}>
                <Button title="Quay lại" variant="outline" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                <Button title="Thanh toán" onPress={() => void submit()} loading={saving} style={{ flex: 2 }} />
              </View>
            </Card>
          ) : <Button title="Tiếp tục" disabled={!q} onPress={() => setConfirm(true)} />}
        </>
      )}
    </ScrollView>
  );
}
