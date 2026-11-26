import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { familyApi } from "@/lib/services";
import type { FamilyElderly, ScheduleDay } from "@/lib/types";

/** Gia đình: danh sách người thân + tiến độ hoạt động hôm nay */
export default function FamilyHome() {
  const { user } = useAuth();
  const [people, setPeople] = useState<FamilyElderly[]>([]);
  const [progress, setProgress] = useState<Record<number, ScheduleDay | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const list = await familyApi.elderly();
      setPeople(list);
      const schedules = await Promise.all(list.map((p) => familyApi.schedule(p.elderlyId).catch(() => null)));
      setProgress(Object.fromEntries(list.map((p, i) => [p.elderlyId, schedules[i]])));
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được hồ sơ người thân."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Text style={s.muted}>Xin chào {user?.fullName}</Text>
        <Text style={[s.title, { marginBottom: 12 }]}>Người thân của bạn</Text>
        <Button title="+ Thêm người thân" variant="outline" onPress={() => router.push({ pathname: "/profile/[id]", params: { id: "new" } })} style={{ marginBottom: 12 }} />
        {!!error && <Notice text={error} tone="error" />}
        {loading ? <Loading /> : people.length === 0 ? <Empty text="Chưa có hồ sơ người thân liên kết." /> : people.map((p) => {
          const sc = progress[p.elderlyId];
          return (
            <Pressable key={p.elderlyId} onPress={() => router.push({ pathname: "/follow/[id]", params: { id: String(p.elderlyId), name: p.fullName } })}>
              <Card>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.title, { fontSize: 16 }]}>{p.fullName}</Text>
                    <Text style={s.muted}>{p.relationship}{p.age ? ` · ${p.age} tuổi` : ""}{sc?.packageName ? ` · gói ${sc.packageName}` : ""}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
                </View>
                <View style={[s.row, { marginTop: 10 }]}>
                  {sc?.packageId
                    ? <Badge text={`Hôm nay: ${sc.doneCount}/${sc.requiredCount} việc đã làm`} tone={sc.doneCount > 0 ? "green" : "gray"} />
                    : <Badge text="Chưa có lịch hôm nay" tone="gray" />}
                </View>
                <View style={[s.row, { marginTop: 10, flexWrap: "wrap" }]}>
                  <Button small title="Theo dõi" onPress={() => router.push({ pathname: "/follow/[id]", params: { id: String(p.elderlyId), name: p.fullName } })} />
                  <Button small variant="outline" title="Hồ sơ" onPress={() => router.push({ pathname: "/profile/[id]", params: { id: String(p.elderlyId) } })} />
                  <Button small variant="outline" title="Đón · vắng · điểm danh" onPress={() => router.push({ pathname: "/manage/[id]", params: { id: String(p.elderlyId), name: p.fullName } })} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
