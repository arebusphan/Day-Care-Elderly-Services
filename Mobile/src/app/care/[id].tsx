import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, Switch, Text, View } from "react-native";
import { EntryCard } from "@/components/EntryCard";
import { Sheet } from "@/components/Sheet";
import { Badge, Button, Card, Chips, colors, Empty, Field, Loading, Notice, s, Segments } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { careTypeLabels, conditionLabels, EDITABLE_TYPES, incidentStatusLabels, incidentTypeLabels, MANUAL_TYPES, roleLabels, severityLabels, statusLabels } from "@/lib/labels";
import { staffApi } from "@/lib/services";
import type { CareLogDay, Dose, Incident, ScheduleDay, ScheduleItem } from "@/lib/types";

type Tab = "schedule" | "journal" | "health" | "incidents";
type Picked = ImagePicker.ImagePickerAsset;
const MAX_PHOTOS = 5;
const statusTone = { Done: "green", Skipped: "gray", Overdue: "red", Pending: "orange" } as const;
const VITAL_FIELDS = [
  ["systolicBp", "Huyết áp tâm thu (mmHg)"], ["diastolicBp", "Huyết áp tâm trương (mmHg)"], ["heartRate", "Nhịp tim (lần/phút)"],
  ["spO2", "SpO₂ (%)"], ["temperature", "Nhiệt độ (°C)"], ["bloodGlucose", "Đường huyết (mmol/L)"],
] as const;

/** Staff: care log 1 cụ hôm nay */
export default function StaffElderly() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const elderlyId = Number(id);
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("schedule");
  const [day, setDay] = useState<CareLogDay | null>(null);
  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState<null | { kind: "skip"; item: ScheduleItem } | { kind: "medical" } | { kind: "close" } | { kind: "resolve"; incident: Incident } | { kind: "dose"; dose: Dose; status: "Refused" | "Missed" }>(null);

  // Form nhật ký
  const [link, setLink] = useState<ScheduleItem | null>(null);
  const [careType, setCareType] = useState("NOTE");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [internal, setInternal] = useState(false);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: number; description: string; notes: string; internal: boolean } | null>(null);
  // Form chỉ số
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [vitalNotes, setVitalNotes] = useState("");
  // Form sự cố
  const [incidentType, setIncidentType] = useState("OTHER");
  const [incidentText, setIncidentText] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [d, sc, ds, inc] = await Promise.all([staffApi.day(elderlyId), staffApi.schedule(elderlyId), staffApi.doses(), staffApi.incidents()]);
      setDay(d); setSchedule(sc);
      setDoses(ds.filter((x) => x.elderlyId === elderlyId));
      setIncidents(inc.filter((x) => x.elderlyId === elderlyId));
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được care log."); }
    finally { setLoading(false); }
  }, [elderlyId]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<string>) => {
    setSaving(true); setError(""); setNotice("");
    try { setNotice(await fn()); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra."); }
    finally { setSaving(false); }
  };

  const closed = !!day?.isClosed;
  const vitalsToday = (day?.entries ?? []).filter((e) => e.careType === "VITALS").reverse();
  const journal = [...(day?.entries ?? [])].reverse();

  // ── Ghi từ lịch ──
  const startRecording = (item: ScheduleItem) => {
    setLink(item); setNotice(""); setError("");
    if (item.careType === "VITALS") { setTab("health"); return; }
    setCareType(MANUAL_TYPES.includes(item.careType) ? item.careType : "NOTE");
    setDescription(`${item.activityName}: `);
    setTab("journal");
  };

  // ── Ảnh ──
  const addPhotos = async (camera: boolean) => {
    setError("");
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { setError("Chưa cho phép dùng camera. Bật quyền camera cho Expo Go trong Cài đặt."); return; }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length });
    if (!result.canceled) setPhotos((cur) => [...cur, ...result.assets].slice(0, MAX_PHOTOS));
  };

  const submitEntry = () => run(async () => {
    if (!description.trim()) throw new Error("Nhập nội dung ghi nhận.");
    if (link && description.trim() === `${link.activityName}:`) throw new Error("Ghi thêm nội dung sau tên hoạt động.");
    const entry = await staffApi.addEntry(elderlyId, {
      careType, description: description.trim(), notes: notes.trim() || undefined, isInternal: internal,
      packageActivityId: link && link.careType !== "VITALS" ? link.packageActivityId : undefined,
    });
    let msg = link ? `Đã ghi "${link.activityName}"` : "Đã lưu ghi nhận";
    if (photos.length) {
      try { const up = await staffApi.uploadPhotos(entry.careLogId, photos); msg += ` kèm ${up.length} ảnh`; }
      catch (err) { msg += ` nhưng tải ảnh lỗi (${err instanceof Error ? err.message : "lỗi"})`; }
    }
    const wasLinked = !!link;
    setDescription(""); setNotes(""); setInternal(false); setPhotos([]); setLink(null);
    if (wasLinked) setTab("schedule");
    return msg + ".";
  });

  const saveEdit = () => run(async () => {
    if (!editing?.description.trim()) throw new Error("Nội dung không được để trống.");
    await staffApi.updateEntry(editing.id, { description: editing.description.trim(), notes: editing.notes.trim() || undefined, isInternal: editing.internal });
    setEditing(null);
    return "Đã cập nhật mục nhật ký.";
  });

  const submitVitals = () => run(async () => {
    const body: Record<string, number | string | undefined> = {};
    VITAL_FIELDS.forEach(([k]) => { const v = vitals[k]?.replace(",", ".").trim(); if (v) body[k] = Number(v); });
    if (Object.keys(body).length === 0) throw new Error("Nhập ít nhất một chỉ số.");
    if (vitalNotes.trim()) body.notes = vitalNotes.trim();
    if (link?.careType === "VITALS") body.packageActivityId = link.packageActivityId;
    const result = await staffApi.recordVitals(elderlyId, body);
    setVitals({}); setVitalNotes(""); setLink(null);
    return result.warnings.length ? `Đã lưu chỉ số. Cảnh báo: ${result.warnings.join("; ")}` : "Đã lưu chỉ số.";
  });

  const submitIncident = () => run(async () => {
    if (!incidentText.trim()) throw new Error("Nhập mô tả sự cố.");
    await staffApi.createIncident(elderlyId, incidentType, incidentText.trim());
    setIncidentText("");
    return "Đã gửi báo cáo sự cố.";
  });

  const openPhoto = (url: string) => { void Linking.openURL(url); };

  return (
    <>
      <Stack.Screen options={{ title: name ?? day?.elderlyName ?? "Chăm sóc" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        {loading ? <Loading /> : (
          <>
            <Card>
              <View style={[s.row, { flexWrap: "wrap" }]}>
                <Badge text={`${day?.entries.length ?? 0} ghi nhận hôm nay`} tone="teal" />
                {day?.isMedicalDone && <Badge text="Y tế: đã xác nhận" tone="green" />}
                {closed && <Badge text="Đã chốt ngày" tone="gray" />}
              </View>
              {!closed && (
                <View style={[s.row, { marginTop: 10 }]}>
                  {!day?.isMedicalDone
                    ? <Button small title="Xác nhận y tế xong" variant="outline" onPress={() => setSheet({ kind: "medical" })} />
                    : <Button small title="Chốt care log" variant="dark" onPress={() => setSheet({ kind: "close" })} />}
                </View>
              )}
              {closed && <Text style={[s.muted, { marginTop: 8 }]}>Care log hôm nay đã chốt, không ghi thêm được.</Text>}
            </Card>

            {!!error && <Notice text={error} tone="error" />}
            {!!notice && <Notice text={notice} tone={notice.includes("Cảnh báo") || notice.includes("lỗi") ? "warn" : "ok"} />}

            <Segments
              value={tab}
              onChange={(v) => { setTab(v); }}
              items={[
                { value: "schedule", label: `Lịch ${schedule ? `${schedule.doneCount}/${schedule.requiredCount}` : ""}` },
                { value: "journal", label: `Nhật ký ${day?.entries.length ?? 0}` },
                { value: "health", label: "Chỉ số & thuốc" },
                { value: "incidents", label: `Sự cố ${incidents.length}` },
              ]}
            />
            <View style={{ height: 12 }} />

            {tab === "schedule" && (!schedule?.packageId ? <Empty text="Cụ chưa có gói dịch vụ còn hiệu lực nên chưa có lịch." /> : (
              <>
                <Text style={s.title}>Gói {schedule.packageName}</Text>
                <Text style={[s.muted, { marginBottom: 10 }]}>Đã làm {schedule.doneCount}/{schedule.requiredCount}{schedule.skippedCount ? ` · bỏ qua ${schedule.skippedCount}` : ""}{schedule.chronicConditions.length ? ` · bệnh nền: ${schedule.chronicConditions.map((c) => conditionLabels[c] ?? c).join(", ")}` : ""}</Text>
                {schedule.items.length === 0 ? <Empty text="Hôm nay không có hoạt động theo lịch." /> : schedule.items.map((item) => (
                  <Card key={item.packageActivityId} style={{ padding: 12 }}>
                    <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-start" }]}>
                      <Text style={[s.muted, { fontWeight: "700" }]}>{item.startTime}–{item.endTime}</Text>
                      <Badge text={statusLabels[item.status]} tone={statusTone[item.status]} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 4 }}>{item.activityName}{!item.isRequired ? " (tùy chọn)" : ""}</Text>
                    <Text style={s.muted}>{careTypeLabels[item.careType] ?? item.careType}{item.targetMinutes ? ` · ${item.targetMinutes} phút` : ""} · {roleLabels[item.performerRole] ?? item.performerRole}</Text>
                    {!!item.purpose && <Text style={s.muted}>Để: {item.purpose}</Text>}
                    {!!item.note && item.status !== "Pending" && <Text style={{ marginTop: 4, color: "#334155" }}>{item.status === "Skipped" ? "Lý do bỏ qua: " : ""}{item.note}{item.staffName ? ` · ${item.staffName}` : ""}</Text>}
                    {!closed && (item.status === "Pending" || item.status === "Overdue") && (
                      <View style={[s.row, { marginTop: 8 }]}>
                        <Button small title="Ghi" onPress={() => startRecording(item)} />
                        <Button small title="Bỏ qua" variant="outline" onPress={() => setSheet({ kind: "skip", item })} />
                      </View>
                    )}
                  </Card>
                ))}
              </>
            ))}

            {tab === "journal" && (
              <>
                {!closed && (
                  <Card>
                    <Text style={[s.title, { marginBottom: 10 }]}>Thêm ghi nhận</Text>
                    {link && link.careType !== "VITALS" && (
                      <View style={[s.notice, { backgroundColor: colors.primarySoft }]}>
                        <Text style={{ color: colors.primaryDark }}>Đang ghi cho hoạt động: {link.startTime} {link.activityName}</Text>
                        <Pressable onPress={() => setLink(null)}><Text style={{ color: colors.primaryDark, textDecorationLine: "underline", marginTop: 4 }}>Bỏ gắn</Text></Pressable>
                      </View>
                    )}
                    <Text style={s.label}>Loại</Text>
                    <Chips value={careType} onChange={setCareType} options={MANUAL_TYPES.map((t) => ({ value: t, label: careTypeLabels[t] }))} />
                    <Field label="Nội dung" value={description} onChangeText={setDescription} multiline placeholder="Ví dụ: ăn hết 80% khẩu phần, tinh thần vui vẻ" />
                    <Field label="Ghi chú thêm (không bắt buộc)" value={notes} onChangeText={setNotes} multiline />
                    <Text style={s.label}>Ảnh (tối đa {MAX_PHOTOS})</Text>
                    <View style={[s.row, { marginBottom: 8 }]}>
                      <Button small title="📷 Chụp ảnh" variant="outline" onPress={() => void addPhotos(true)} disabled={photos.length >= MAX_PHOTOS} />
                      <Button small title="🖼 Chọn ảnh" variant="outline" onPress={() => void addPhotos(false)} disabled={photos.length >= MAX_PHOTOS} />
                    </View>
                    {photos.length > 0 && (
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                        {photos.map((p, i) => (
                          <View key={p.uri + i}>
                            <Image source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: 8 }} />
                            <Pressable onPress={() => setPhotos((cur) => cur.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, backgroundColor: colors.danger, borderRadius: 999, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ color: "#fff", fontWeight: "700" }}>×</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
                      <Text style={{ color: colors.text }}>Ghi chú nội bộ (gia đình không xem)</Text>
                      <Switch value={internal} onValueChange={setInternal} />
                    </View>
                    <Button title="Lưu ghi nhận" onPress={() => void submitEntry()} loading={saving} disabled={!description.trim()} />
                  </Card>
                )}
                <Text style={[s.title, { marginBottom: 8 }]}>Lịch sử trong ngày</Text>
                {journal.length === 0 ? <Empty text="Chưa có ghi nhận." /> : journal.map((entry) =>
                  editing?.id === entry.careLogId ? (
                    <Card key={entry.careLogId}>
                      <Field label="Nội dung" value={editing.description} onChangeText={(v) => setEditing({ ...editing, description: v })} multiline />
                      <Field label="Ghi chú thêm" value={editing.notes} onChangeText={(v) => setEditing({ ...editing, notes: v })} multiline />
                      <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
                        <Text>Ghi chú nội bộ</Text>
                        <Switch value={editing.internal} onValueChange={(v) => setEditing({ ...editing, internal: v })} />
                      </View>
                      <View style={s.row}>
                        <Button small title="Hủy" variant="outline" onPress={() => setEditing(null)} />
                        <Button small title="Lưu sửa" onPress={() => void saveEdit()} loading={saving} />
                      </View>
                    </Card>
                  ) : (
                    <EntryCard
                      key={entry.careLogId}
                      entry={entry}
                      onOpenPhoto={openPhoto}
                      action={!closed && entry.staffId === user?.userId && EDITABLE_TYPES.includes(entry.careType)
                        ? <Pressable onPress={() => setEditing({ id: entry.careLogId, description: entry.description, notes: entry.notes ?? "", internal: entry.isInternal })}><Text style={{ color: colors.primary, fontWeight: "600" }}>Sửa</Text></Pressable>
                        : undefined}
                    />
                  ))}
              </>
            )}

            {tab === "health" && (
              <>
                {!closed && (
                  <Card>
                    <Text style={[s.title, { marginBottom: 6 }]}>Đo chỉ số</Text>
                    <Text style={[s.muted, { marginBottom: 10 }]}>Vượt ngưỡng sẽ tự tạo cảnh báo và báo cho gia đình.</Text>
                    {link?.careType === "VITALS" && <Notice text={`Đang ghi cho hoạt động: ${link.startTime} ${link.activityName}`} />}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                      {VITAL_FIELDS.map(([k, label]) => (
                        <View key={k} style={{ width: "48%" }}>
                          <Field label={label} value={vitals[k] ?? ""} onChangeText={(v) => setVitals((cur) => ({ ...cur, [k]: v }))} keyboardType="decimal-pad" />
                        </View>
                      ))}
                    </View>
                    <Field label="Ghi chú" value={vitalNotes} onChangeText={setVitalNotes} />
                    <Button title="Lưu chỉ số" onPress={() => void submitVitals()} loading={saving} />
                  </Card>
                )}
                <Text style={[s.title, { marginBottom: 8 }]}>Thuốc hôm nay</Text>
                {doses.length === 0 ? <Empty text="Không có liều thuốc hôm nay." /> : doses.map((d) => (
                  <Card key={d.medicationRecordId} style={{ padding: 12 }}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{d.medicationName} · {d.dosage}</Text>
                      <Badge text={d.statusLabel || d.status} tone={d.status === "Given" ? "green" : d.status === "Pending" ? "orange" : "red"} />
                    </View>
                    <Text style={s.muted}>{timeLabel(d.scheduledAt)}{d.instructions ? ` · ${d.instructions}` : ""}</Text>
                    {d.status === "Pending" && !closed && (
                      <View style={[s.row, { marginTop: 8 }]}>
                        <Button small title="Đã uống" onPress={() => void run(async () => { await staffApi.updateDose(d.medicationRecordId, "Given"); return `Đã ghi: ${d.medicationName} đã uống.`; })} />
                        <Button small title="Từ chối" variant="outline" onPress={() => setSheet({ kind: "dose", dose: d, status: "Refused" })} />
                        <Button small title="Thiếu thuốc" variant="outline" onPress={() => setSheet({ kind: "dose", dose: d, status: "Missed" })} />
                      </View>
                    )}
                  </Card>
                ))}
                <Text style={[s.title, { marginVertical: 8 }]}>Các lần đo hôm nay ({vitalsToday.length})</Text>
                {vitalsToday.length === 0 ? <Empty text="Chưa đo lần nào." /> : vitalsToday.map((e) => <EntryCard key={e.careLogId} entry={e} />)}
              </>
            )}

            {tab === "incidents" && (
              <>
                {!closed && (
                  <Card>
                    <Text style={[s.title, { marginBottom: 10 }]}>Báo sự cố</Text>
                    <Chips value={incidentType} onChange={setIncidentType} options={[
                      { value: "OTHER", label: "Sự cố khác" }, { value: "FALL", label: "Ngã" }, { value: "STROKE", label: "Nghi đột quỵ (khẩn)" }, { value: "LOST", label: "Mất dấu (khẩn)" },
                    ]} />
                    <Field label="Mô tả" value={incidentText} onChangeText={setIncidentText} multiline />
                    <Button title="Gửi báo cáo" variant="danger" onPress={() => void submitIncident()} loading={saving} />
                  </Card>
                )}
                {incidents.length === 0 ? <Empty text="Không có sự cố trong 30 ngày." /> : incidents.map((inc) => (
                  <Card key={inc.incidentId} style={{ padding: 12, borderColor: "#fecdd3" }}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{incidentTypeLabels[inc.incidentType] ?? inc.incidentType}</Text>
                      <Badge text={incidentStatusLabels[inc.status] ?? inc.status} tone={inc.status === "Resolved" ? "green" : inc.status === "InProgress" ? "orange" : "red"} />
                    </View>
                    <Text style={s.muted}>Mức {(severityLabels[inc.severity] ?? inc.severity).toLowerCase()} · {new Date(inc.occurredAt).toLocaleString("vi-VN")}</Text>
                    <Text style={{ marginTop: 4, color: colors.text }}>{inc.description}</Text>
                    {!!inc.resolutionNotes && <Text style={{ marginTop: 4, color: "#334155" }}>Kết quả: {inc.resolutionNotes}</Text>}
                    {inc.status !== "Resolved" && (
                      <View style={[s.row, { marginTop: 8 }]}>
                        {inc.status === "Open" && <Button small title="Nhận xử lý" variant="outline" onPress={() => void run(async () => { await staffApi.updateIncident(inc.incidentId, "InProgress"); return "Đã nhận xử lý sự cố."; })} />}
                        <Button small title="Đánh dấu đã xử lý" onPress={() => setSheet({ kind: "resolve", incident: inc })} />
                      </View>
                    )}
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Sheet
        visible={!!sheet}
        title={sheet?.kind === "skip" ? "Bỏ qua hoạt động" : sheet?.kind === "medical" ? "Xác nhận y tế xong?" : sheet?.kind === "close" ? "Chốt care log hôm nay?" : sheet?.kind === "resolve" ? "Đóng sự cố" : sheet?.kind === "dose" ? (sheet.status === "Refused" ? "Cụ từ chối uống" : "Thiếu thuốc") : ""}
        message={sheet?.kind === "skip" ? `${sheet.item.startTime} · ${sheet.item.activityName}` : sheet?.kind === "medical" ? "Xác nhận đã đo chỉ số và xử lý hết liều thuốc tới giờ." : sheet?.kind === "close" ? "Sau khi chốt sẽ không ghi thêm được trong ngày." : sheet?.kind === "dose" ? `${sheet.dose.medicationName} · ${sheet.dose.dosage}` : undefined}
        inputLabel={sheet?.kind === "skip" ? "Lý do (gia đình xem được)" : sheet?.kind === "resolve" ? "Kết quả xử lý" : sheet?.kind === "dose" ? "Lý do" : undefined}
        confirmText={sheet?.kind === "close" ? "Chốt care log" : sheet?.kind === "skip" ? "Bỏ qua" : "Xác nhận"}
        danger={sheet?.kind === "close"}
        onCancel={() => setSheet(null)}
        onConfirm={async (text) => {
          const current = sheet;
          if (!current) return;
          if (current.kind === "skip") await staffApi.addEntry(elderlyId, { careType: "SKIP", description: text, isInternal: false, packageActivityId: current.item.packageActivityId });
          if (current.kind === "medical") await staffApi.markMedicalDone(elderlyId);
          if (current.kind === "close") await staffApi.closeDay(elderlyId);
          if (current.kind === "resolve") await staffApi.updateIncident(current.incident.incidentId, "Resolved", text);
          if (current.kind === "dose") await staffApi.updateDose(current.dose.medicationRecordId, current.status, text);
          setSheet(null);
          setNotice(current.kind === "skip" ? `Đã bỏ qua "${current.item.activityName}".` : current.kind === "medical" ? "Đã xác nhận phần y tế." : current.kind === "close" ? "Đã chốt care log hôm nay." : current.kind === "resolve" ? "Đã đóng sự cố." : "Đã cập nhật liều thuốc.");
          await load();
        }}
      />
    </>
  );
}
