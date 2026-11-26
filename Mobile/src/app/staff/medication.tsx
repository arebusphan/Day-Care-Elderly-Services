import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Avatar, Card, Empty, ListRow, Loading, Notice } from "@/components/ui";
import { staffApi } from "@/lib/services";
import type { ElderlyInGroup } from "@/lib/types";

/** Staff › Thuốc: chọn cụ trong nhóm để xem / tạo / sửa kế hoạch thuốc */
export default function StaffMedication() {
  const [people, setPeople] = useState<ElderlyInGroup[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setPeople((await staffApi.myGroup()).elderlyList); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được danh sách cụ."); setPeople([]); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {people === null ? <Loading /> : people.length === 0 ? <Empty text="Hôm nay chưa có phân công." /> : (
        <Card style={{ paddingVertical: 4 }}>
          {people.map((p, i) => (
            <ListRow key={p.elderlyId} last={i === people.length - 1} left={<Avatar name={p.fullName} />} title={p.fullName}
              right={<Ionicons name="chevron-forward" size={18} color="#94a3b8" />}
              onPress={() => router.push({ pathname: "/medication/[id]", params: { id: String(p.elderlyId), name: p.fullName } })} />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
