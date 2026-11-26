import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { EntryCard } from "@/components/EntryCard";
import { Badge, Card, colors, Empty, Loading, Notice, s, Segments } from "@/components/ui";
import { dateLabel, timeLabel } from "@/lib/api";
import { incidentStatusLabels, incidentTypeLabels, severityLabels, statusLabels } from "@/lib/labels";
import { familyApi } from "@/lib/services";
import type { CareLogDay, HealthHistory, Incident, ScheduleDay } from "@/lib/types";

type Tab = "activities" | "journal" | "health" | "incidents";

/** Gia đình theo dõi 1 người thân: hoạt động hôm nay, nhật ký, chỉ số & thuốc, sự cố (ẩn ghi chú nội bộ) */
export default function FamilyElderly() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const elderlyId = Number(id);
  const [tab, setTab] = useState<Tab>("activities");
  const [schedule, setSchedule] = useState<ScheduleDay | null>(null);
  const [timeline, setTimeline] = useState<CareLogDay[]>([]);
  const [health, setHealth] = useState<HealthHistory | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [sc, tl, h, inc] = await Promise.all([
        familyApi.schedule(elderlyId).catch(() => null),
        familyApi.timeline(elderlyId, 7),
        familyApi.health(elderlyId, 30),
        familyApi.incidents(30),
      ]);
      setSchedule(sc); setTimeline(tl); setHealth(h);
      setIncidents(inc.filter((x) => x.elderlyId === elderlyId));
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được dữ liệu."); }
    finally { setLoading(false); }
  }, [elderlyId]);
  useEffect(() => { void load(); }, [load]);

  const entryCount = timeline.reduce((n, d) => n + d.entries.length, 0);
  const openPhoto = (url: string) => { void Linking.openURL(url); };

  return (
    <>
      <Stack.Screen options={{ title: name ?? "Theo dõi" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        {!!error && <Notice text={error} tone="error" />}
        {loading ? <Loading /> : (
          <>
            <Segments value={tab} onChange={setTab} items={[
              { value: "activities", label: `Hôm nay ${schedule?.packageId ? `${schedule.doneCount}/${schedule.requiredCount}` : ""}` },
              { value: "journal", label: `Nhật ký ${entryCount}` },
              { value: "health", label: "Chỉ số & thuốc" },
              { value: "incidents", label: `Sự cố ${incidents.length}` },
            ]} />
            <View style={{ height: 12 }} />

            {tab === "activities" && (!schedule?.packageId ? <Empty text="Chưa có lịch hoạt động hôm nay (chưa có gói còn hiệu lực)." /> : (
              <>
                <Text style={s.title}>Gói {schedule.packageName}</Text>
                <Text style={[s.muted, { marginBottom: 10 }]}>Đã làm {schedule.doneCount}/{schedule.requiredCount} việc{schedule.skippedCount ? ` · bỏ qua ${schedule.skippedCount}` : ""}</Text>
                {schedule.items.map((item) => (
                  <Card key={item.packageActivityId} style={{ padding: 12 }}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Text style={[s.muted, { fontWeight: "700" }]}>{item.startTime}–{item.endTime}</Text>
                      <Badge text={item.status === "Overdue" ? "Chưa ghi nhận" : statusLabels[item.status]} tone={item.status === "Done" ? "green" : item.status === "Skipped" ? "gray" : "orange"} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text, marginTop: 4 }}>{item.activityName}</Text>
                    {!!item.purpose && <Text style={s.muted}>Để: {item.purpose}</Text>}
                    {!!item.note && item.status !== "Pending" && <Text style={{ marginTop: 4, color: "#334155" }}>{item.status === "Skipped" ? "Lý do bỏ qua: " : ""}{item.note}</Text>}
                  </Card>
                ))}
              </>
            ))}

            {tab === "journal" && (timeline.length === 0 ? <Empty text="Chưa có ghi nhận trong 7 ngày." /> : timeline.map((d) => (
              <View key={d.date} style={{ marginBottom: 8 }}>
                <Text style={[s.title, { fontSize: 15, marginBottom: 6 }]}>{dateLabel(d.date).replace(/^./, (c) => c.toUpperCase())} · {d.entries.length} ghi nhận</Text>
                {[...d.entries].reverse().map((e) => <EntryCard key={e.careLogId} entry={e} onOpenPhoto={openPhoto} />)}
              </View>
            )))}

            {tab === "health" && (
              <>
                <Text style={[s.title, { marginBottom: 8 }]}>Các lần đo chỉ số (30 ngày)</Text>
                {!health?.vitals.length ? <Empty text="Chưa có lần đo." /> : health.vitals.map((e) => <EntryCard key={e.careLogId} entry={e} />)}
                <Text style={[s.title, { marginVertical: 8 }]}>Lịch sử thuốc</Text>
                {!health?.doses.length ? <Empty text="Chưa có liều thuốc." /> : health.doses.map((d) => (
                  <Card key={d.medicationRecordId} style={{ padding: 12 }}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Text style={{ fontWeight: "600", color: colors.text, flex: 1 }}>{d.medicationName} · {d.dosage}</Text>
                      <Badge text={d.statusLabel || d.status} tone={d.status === "Given" ? "green" : d.status === "Pending" ? "orange" : "red"} />
                    </View>
                    <Text style={s.muted}>{new Date(d.scheduledAt).toLocaleDateString("vi-VN")} {timeLabel(d.scheduledAt)}{d.notes ? ` · ${d.notes}` : ""}</Text>
                  </Card>
                ))}
              </>
            )}

            {tab === "incidents" && (incidents.length === 0 ? <Empty text="Không có sự cố trong 30 ngày." /> : incidents.map((inc) => (
              <Card key={inc.incidentId} style={{ padding: 12, borderColor: "#fecdd3" }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{incidentTypeLabels[inc.incidentType] ?? inc.incidentType}</Text>
                  <Badge text={incidentStatusLabels[inc.status] ?? inc.status} tone={inc.status === "Resolved" ? "green" : "orange"} />
                </View>
                <Text style={s.muted}>Mức {(severityLabels[inc.severity] ?? inc.severity).toLowerCase()} · {new Date(inc.occurredAt).toLocaleString("vi-VN")}</Text>
                <Text style={{ marginTop: 4, color: colors.text }}>{inc.description}</Text>
                {!!inc.resolutionNotes && <Text style={{ marginTop: 4, color: "#334155" }}>Đã xử lý: {inc.resolutionNotes}</Text>}
              </Card>
            )))}
          </>
        )}
      </ScrollView>
    </>
  );
}
