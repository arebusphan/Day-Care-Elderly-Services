import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Avatar, Badge, Card, colors, Empty, Greeting, Loading, Notice, Progress, s } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { careTypeLabels } from "@/lib/labels";
import { familyApi } from "@/lib/services";
import { familyMoreApi } from "@/lib/services2";
import type { ScheduleDay } from "@/lib/types";
import { memberStatusLabels, type FamilyOverview } from "@/lib/types2";

const lastName = (n?: string) => n?.trim().split(/\s+/).pop() ?? "";

/** Gia đình › Hôm nay của từng người thân (gọn: trạng thái, tiến độ, 1 hoạt động gần nhất) */
export default function FamilyOverviewScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [plans, setPlans] = useState<Record<number, ScheduleDay | null>>({});
  const [relations, setRelations] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [o, list] = await Promise.all([familyMoreApi.overview(), familyApi.elderly().catch(() => [])]);
      setData(o); setError("");
      setRelations(Object.fromEntries(list.map((p) => [p.elderlyId, p.relationship])));
      const sc = await Promise.all(o.members.map((m) => familyApi.schedule(m.elderlyId).catch(() => null)));
      setPlans(Object.fromEntries(o.members.map((m, i) => [m.elderlyId, sc[i]])));
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được."); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      <Greeting name={lastName(user?.fullName)} unread={data?.unreadNotifications} onBell={() => router.push("/notifications")} />
      {!!error && <Notice text={error} tone="error" />}
      {!data ? (error ? null : <Loading />) : data.members.length === 0 ? <Empty text="Chưa có hồ sơ người thân." /> : data.members.map((m) => {
        const plan = plans[m.elderlyId];
        const here = m.status === "Present";
        const time = m.checkOutAt ? `Về ${timeLabel(m.checkOutAt)}` : m.checkInAt ? `Đến ${timeLabel(m.checkInAt)}` : null;
        return (
          <Pressable key={m.elderlyId} onPress={() => router.push({ pathname: "/follow/[id]", params: { id: String(m.elderlyId), name: m.fullName } })}>
            <Card>
              <View style={[s.row, { gap: 12 }]}>
                <Avatar name={m.fullName} active={here} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{m.fullName}</Text>
                  {!!relations[m.elderlyId] && <Text style={s.muted}>{relations[m.elderlyId]}</Text>}
                </View>
              </View>
              <View style={[s.row, { marginTop: 10, flexWrap: "wrap" }]}>
                <Badge text={memberStatusLabels[m.status]} tone={here ? "green" : m.status === "Absent" ? "red" : "gray"} />
                {!!time && <Badge text={time} />}
                {m.openIncidents.length > 0 && <Badge text={`${m.openIncidents.length} sự cố`} tone="red" />}
                {m.doses.pending > 0 && <Badge text={`${m.doses.pending} liều thuốc chờ`} tone="orange" />}
              </View>
              {!!plan?.requiredCount && (
                <View style={{ marginTop: 12 }}>
                  <Progress value={plan.doneCount} total={plan.requiredCount} />
                  <Text style={[s.muted, { marginTop: 4 }]}>
                    {plan.doneCount}/{plan.requiredCount} hoạt động{m.latestVitals?.bloodPressure ? ` · HA ${m.latestVitals.bloodPressure}` : ""}
                  </Text>
                </View>
              )}
              {m.latestActivity && (
                <Text style={{ color: colors.text, marginTop: 8 }} numberOfLines={1}>
                  {timeLabel(m.latestActivity.recordedAt)} · {careTypeLabels[m.latestActivity.careType] ?? m.latestActivity.careType}
                </Text>
              )}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
