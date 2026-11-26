import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { familyMoreApi } from "@/lib/services2";
import { money, type ServicePackage } from "@/lib/types2";

/** Gia đình › Danh sách gói dịch vụ */
export default function Packages() {
  const [list, setList] = useState<ServicePackage[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setList((await familyMoreApi.packages()).filter((p) => p.isActive)); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được gói dịch vụ."); setList([]); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {list === null ? <Loading /> : list.length === 0 ? <Empty text="Chưa có gói dịch vụ." /> : list.map((p) => {
        const key = String(p.packageId);
        const full = p.availableSlots <= 0;
        return (
          <Card key={key}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={[s.title, { fontSize: 16, flex: 1 }]}>{p.packageName}</Text>
              <Badge text={full ? "Hết chỗ" : `Còn ${p.availableSlots}/${p.totalSlots} chỗ`} tone={full ? "red" : "green"} />
            </View>
            {!!p.targetAudience && <Text style={s.muted}>Dành cho: {p.targetAudience}</Text>}
            {!!p.description && <Text style={{ color: colors.text, marginTop: 6 }}>{p.description}</Text>}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: colors.text }}>Theo ngày: <Text style={{ fontWeight: "700" }}>{money(p.pricePerDay)}</Text></Text>
              <Text style={{ color: colors.text }}>Tháng 3 buổi/tuần: <Text style={{ fontWeight: "700" }}>{money(p.priceMonth3Days)}</Text></Text>
              <Text style={{ color: colors.text }}>Tháng cả tuần (T2–T7): <Text style={{ fontWeight: "700" }}>{money(p.priceMonthFullWeek)}</Text></Text>
            </View>
            {open === key && (
              <View style={{ marginTop: 8 }}>
                {p.highlights.map((h) => <Text key={h} style={{ color: colors.text }}>• {h}</Text>)}
                {p.includedServices.length > 0 && <Text style={[s.label, { marginTop: 6 }]}>Dịch vụ bao gồm</Text>}
                {p.includedServices.map((h) => <Text key={h} style={s.muted}>✓ {h}</Text>)}
                {!!p.pricingNote && <Text style={[s.muted, { marginTop: 6 }]}>{p.pricingNote}</Text>}
              </View>
            )}
            <View style={[s.row, { marginTop: 10 }]}>
              <Button small variant="outline" title={open === key ? "Thu gọn" : "Chi tiết"} onPress={() => setOpen(open === key ? null : key)} />
              <Button small title="Đăng ký" disabled={full} onPress={() => router.push({ pathname: "/register", params: { packageId: key } })} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
