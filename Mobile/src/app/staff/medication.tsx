import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
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
      <Text style={[s.muted, { marginBottom: 12 }]}>Kế hoạch thuốc do gia đình gửi kèm. Chọn cụ để xem, thêm hoặc sửa, và sinh lịch liều.</Text>
      {!!error && <Notice text={error} tone="error" />}
      {people === null ? <Loading /> : people.length === 0 ? <Empty text="Hôm nay bạn chưa được phân công cụ nào." /> : people.map((p) => (
        <Pressable key={p.elderlyId} onPress={() => router.push({ pathname: "/medication/[id]", params: { id: String(p.elderlyId), name: p.fullName } })}>
          <Card style={{ padding: 14 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{p.fullName}</Text>
              <Text style={{ color: colors.primary, fontSize: 20 }}>›</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
