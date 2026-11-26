import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Avatar, Badge, Card, colors, Empty, Greeting, ListRow, Loading, Notice, Section, StatTile } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { staffMoreApi } from "@/lib/services2";
import { memberStatusLabels, type StaffOverview } from "@/lib/types2";

const lastName = (n?: string) => n?.trim().split(/\s+/).pop() ?? "";

/** Staff › Tổng quan ca trực hôm nay */
export default function StaffOverviewScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setData(await staffMoreApi.overview()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được tổng quan."); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const present = data?.members.filter((m) => m.status === "Present").length ?? 0;
  const closed = data?.members.filter((m) => m.closed).length ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      <Greeting name={lastName(user?.fullName)} unread={data?.unreadNotifications} onBell={() => router.push("/notifications")} />
      {!!error && <Notice text={error} tone="error" />}
      {!data ? (error ? null : <Loading />) : !data.hasPublishedPlan || !data.group ? <Empty text="Hôm nay chưa có phân công." /> : (
        <>
          <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: "#ccfbf1", fontSize: 13 }}>{data.group.groupType === "Support" ? "Nhóm cần hỗ trợ" : "Nhóm bình thường"}</Text>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{data.group.groupName}</Text>
            <Text style={{ color: "#fff", marginTop: 6 }}>{present}/{data.members.length} cụ có mặt</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <StatTile icon="medkit-outline" value={data.doses.pending} label={data.doses.overdue ? `${data.doses.overdue} trễ` : "Liều chờ"} tone={data.doses.overdue ? colors.danger : colors.text} onPress={() => router.push("/staff/medication")} />
            <StatTile icon="warning-outline" value={data.openIncidents} label="Sự cố" tone={data.openIncidents ? colors.danger : colors.text} />
            <StatTile icon="checkmark-done-outline" value={`${closed}/${data.members.length}`} label="Đã chốt" />
          </View>
          {data.doses.next.length > 0 && (
            <>
              <Section title="Liều thuốc sắp tới" />
              <Card style={{ paddingVertical: 4 }}>
                {data.doses.next.slice(0, 4).map((d, i, arr) => (
                  <ListRow key={d.medicationRecordId} last={i === arr.length - 1}
                    left={<Ionicons name="time-outline" size={20} color={colors.primary} />}
                    title={`${timeLabel(d.scheduledAt)} · ${d.medicationName}`} sub={d.elderlyName} />
                ))}
              </Card>
            </>
          )}
          <Section title="Cụ trong nhóm" />
          <Card style={{ paddingVertical: 4 }}>
            {data.members.map((m, i) => (
              <ListRow key={m.elderlyId} last={i === data.members.length - 1}
                left={<Avatar name={m.fullName} active={m.status === "Present"} />}
                title={m.fullName}
                sub={m.allergies ? `Dị ứng: ${m.allergies}` : `${m.entries} ghi nhận`} subTone={m.allergies ? colors.danger : undefined}
                right={<Badge text={memberStatusLabels[m.status]} tone={m.status === "Present" ? "green" : "gray"} />}
                onPress={m.status === "Present" ? () => router.push({ pathname: "/care/[id]", params: { id: String(m.elderlyId), name: m.fullName } }) : undefined} />
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}
