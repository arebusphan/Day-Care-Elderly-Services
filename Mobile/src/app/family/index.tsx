import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { careTypeLabels, incidentTypeLabels, severityLabels } from "@/lib/labels";
import { familyMoreApi } from "@/lib/services2";
import { memberStatusLabels, type FamilyOverview } from "@/lib/types2";

/** Gia đình › Tổng quan hôm nay của từng người thân */
export default function FamilyOverviewScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData(await familyMoreApi.overview()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được tổng quan."); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      <Text style={s.muted}>Xin chào {user?.fullName}</Text>
      <Text style={[s.title, { marginBottom: 12 }]}>Hôm nay của người thân</Text>
      {!!error && <Notice text={error} tone="error" />}
      {data && data.unreadNotifications > 0 && (
        <Pressable onPress={() => router.push("/notifications")}><Notice text={`Bạn có ${data.unreadNotifications} thông báo chưa đọc ›`} tone="warn" /></Pressable>
      )}
      {!data ? (error ? null : <Loading />) : data.members.length === 0 ? <Empty text="Chưa có hồ sơ người thân." /> : data.members.map((m) => (
        <Pressable key={m.elderlyId} onPress={() => router.push({ pathname: "/follow/[id]", params: { id: String(m.elderlyId), name: m.fullName } })}>
          <Card>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={[s.title, { fontSize: 16, flex: 1 }]}>{m.fullName}</Text>
              <Badge text={memberStatusLabels[m.status]} tone={m.status === "Present" ? "green" : m.status === "Absent" ? "red" : m.status === "Left" ? "teal" : "gray"} />
            </View>
            <Text style={s.muted}>
              {m.checkInAt ? `Đến ${timeLabel(m.checkInAt)}` : "Chưa đến"}{m.checkOutAt ? ` · Về ${timeLabel(m.checkOutAt)}${m.pickupName ? ` (${m.pickupName} đón)` : ""}` : ""}
            </Text>
            {m.packages.length > 0 && <Text style={s.muted}>Gói: {m.packages.map((p) => p.packageName + (p.endDate ? ` (đến ${p.endDate.slice(0, 10)})` : "")).join(", ")}</Text>}
            {m.latestActivity && (
              <Text style={{ color: colors.text, marginTop: 6 }}>
                {timeLabel(m.latestActivity.recordedAt)} · {careTypeLabels[m.latestActivity.careType] ?? m.latestActivity.careType}: {m.latestActivity.description}
              </Text>
            )}
            {m.latestVitals && (
              <Text style={s.muted}>Sinh hiệu {timeLabel(m.latestVitals.recordedAt)}: {m.latestVitals.bloodPressure ? `HA ${m.latestVitals.bloodPressure}` : ""}{m.latestVitals.bloodGlucose ? ` · Đường huyết ${m.latestVitals.bloodGlucose}` : ""}</Text>
            )}
            <View style={[s.row, { marginTop: 8, flexWrap: "wrap" }]}>
              <Badge text={`${m.entriesToday} ghi chép`} tone="teal" />
              {m.doses.total > 0 && <Badge text={`Thuốc ${m.doses.given}/${m.doses.total}`} tone={m.doses.pending > 0 ? "orange" : "green"} />}
              {m.upcomingAbsences.length > 0 && <Badge text={`Báo vắng ${m.upcomingAbsences.map((d) => d.slice(5, 10)).join(", ")}`} tone="gray" />}
            </View>
            {m.openIncidents.map((i, k) => (
              <Text key={k} style={{ color: colors.danger, marginTop: 6, fontSize: 13 }}>
                ⚠ {incidentTypeLabels[i.incidentType] ?? i.incidentType} · {severityLabels[i.severity] ?? i.severity} · {timeLabel(i.occurredAt)}
              </Text>
            ))}
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
