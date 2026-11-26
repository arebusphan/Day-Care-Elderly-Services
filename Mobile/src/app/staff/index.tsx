import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { staffMoreApi } from "@/lib/services2";
import { memberStatusLabels, type StaffOverview } from "@/lib/types2";

const Stat = ({ label, value, tone = colors.text }: { label: string; value: number | string; tone?: string }) => (
  <View style={[s.card, { flex: 1, minWidth: "45%", marginBottom: 0 }]}>
    <Text style={s.muted}>{label}</Text>
    <Text style={{ fontSize: 24, fontWeight: "800", color: tone, marginTop: 2 }}>{value}</Text>
  </View>
);

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
      <Text style={s.muted}>Xin chào {user?.fullName}</Text>
      <Text style={[s.title, { marginBottom: 12 }]}>{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}</Text>
      {!!error && <Notice text={error} tone="error" />}
      {!data ? <Loading /> : !data.hasPublishedPlan ? <Notice text="Hôm nay chưa có kế hoạch được công bố." tone="warn" /> : (
        <>
          <Card><Text style={s.title}>{data.group?.groupName ?? "Chưa được phân nhóm"}</Text>{data.group && <Text style={s.muted}>Loại nhóm: {data.group.groupType === "Support" ? "Cần hỗ trợ" : "Bình thường"}</Text>}</Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <Stat label="Cụ phụ trách" value={data.members.length} />
            <Stat label="Đang có mặt" value={present} tone={colors.ok} />
            <Stat label="Care log đã chốt" value={`${closed}/${data.members.length}`} />
            <Stat label="Thuốc chờ / trễ" value={`${data.doses.pending}/${data.doses.overdue}`} tone={data.doses.overdue ? colors.danger : colors.text} />
            <Stat label="Sự cố đang mở" value={data.openIncidents} tone={data.openIncidents ? colors.danger : colors.text} />
            <Stat label="Thông báo chưa đọc" value={data.unreadNotifications} />
          </View>
          {data.doses.next.length > 0 && (
            <Card>
              <Text style={[s.title, { fontSize: 15, marginBottom: 6 }]}>Liều thuốc sắp tới</Text>
              {data.doses.next.map((d) => <Text key={d.medicationRecordId} style={{ color: colors.text, marginBottom: 2 }}>{timeLabel(d.scheduledAt)} · {d.elderlyName} · {d.medicationName}</Text>)}
            </Card>
          )}
          <Text style={[s.title, { fontSize: 15, marginBottom: 8 }]}>Cụ trong nhóm</Text>
          {data.members.length === 0 ? <Empty text="Chưa có cụ nào." /> : data.members.map((m) => (
            <Pressable key={m.elderlyId} disabled={m.status !== "Present"} onPress={() => router.push({ pathname: "/care/[id]", params: { id: String(m.elderlyId), name: m.fullName } })}>
              <Card style={{ padding: 12 }}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{m.fullName}</Text>
                  <Badge text={memberStatusLabels[m.status]} tone={m.status === "Present" ? "green" : m.status === "Left" ? "orange" : "gray"} />
                </View>
                <Text style={s.muted}>{m.entries} ghi nhận{m.hasVitals ? " · đã đo chỉ số" : ""}{m.medicalDone ? " · y tế xong" : ""}{m.closed ? " · đã chốt" : ""}</Text>
                {!!m.allergies && <Text style={{ color: colors.warn, fontSize: 13 }}>Dị ứng: {m.allergies}</Text>}
              </Card>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}
