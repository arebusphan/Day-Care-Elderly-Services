import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Avatar, Button, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { familyApi } from "@/lib/services";
import type { FamilyElderly } from "@/lib/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const Action = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
    <Ionicons name={icon} size={22} color={colors.primary} />
    <Text style={{ fontSize: 12, color: colors.text, marginTop: 4 }}>{label}</Text>
  </Pressable>
);

/** Gia đình › Người thân: mỗi người 1 thẻ, 3 lối tắt bằng icon */
export default function FamilyElderlyList() {
  const [people, setPeople] = useState<FamilyElderly[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setPeople(await familyApi.elderly()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được hồ sơ người thân."); setPeople([]); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {people === null ? <Loading /> : people.length === 0 ? <Empty text="Chưa có hồ sơ người thân." /> : people.map((p) => {
        const params = { id: String(p.elderlyId), name: p.fullName };
        return (
          <Card key={p.elderlyId} style={{ paddingBottom: 6 }}>
            <View style={[s.row, { gap: 12 }]}>
              <Avatar name={p.fullName} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{p.fullName}</Text>
                <Text style={s.muted}>{p.relationship}{p.age ? ` · ${p.age} tuổi` : ""}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: colors.border, marginTop: 12 }}>
              <Action icon="pulse-outline" label="Theo dõi" onPress={() => router.push({ pathname: "/follow/[id]", params })} />
              <Action icon="document-text-outline" label="Hồ sơ" onPress={() => router.push({ pathname: "/profile/[id]", params: { id: params.id } })} />
              <Action icon="car-outline" label="Đón & vắng" onPress={() => router.push({ pathname: "/manage/[id]", params })} />
            </View>
          </Card>
        );
      })}
      <Button title="+ Thêm người thân" variant="outline" onPress={() => router.push({ pathname: "/profile/[id]", params: { id: "new" } })} />
    </ScrollView>
  );
}
