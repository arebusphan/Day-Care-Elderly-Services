import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Button, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { accountApi } from "@/lib/services2";
import type { NotificationItem } from "@/lib/types2";

/** Thông báo trong app (cảnh báo chỉ số, sự cố, thuốc, đơn nghỉ...). Bấm để đánh dấu đã đọc. */
export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setItems((await accountApi.notifications(false, 50)).items); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được thông báo."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const read = async (n: NotificationItem) => {
    if (n.isRead) return;
    try { await accountApi.markRead(n.notificationId); setItems((cur) => cur?.map((x) => x.notificationId === n.notificationId ? { ...x, isRead: true } : x) ?? null); }
    catch { /* bỏ qua */ }
  };

  const unread = items?.filter((n) => !n.isRead).length ?? 0;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {unread > 0 && <Button small variant="outline" title={`Đánh dấu đã đọc tất cả (${unread})`} onPress={() => void accountApi.markAllRead().then(load)} style={{ marginBottom: 12, alignSelf: "flex-start" }} />}
      {items === null ? <Loading /> : items.length === 0 ? <Empty text="Chưa có thông báo." /> : items.map((n) => (
        <Pressable key={n.notificationId} onPress={() => void read(n)}>
          <Card style={{ padding: 12, backgroundColor: n.isRead ? "#fff" : "#f0fdfa", borderColor: n.isRead ? colors.border : "#99f6e4" }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: n.isRead ? "600" : "800", color: colors.text, flex: 1 }}>{n.title}</Text>
              {!n.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ marginTop: 4, color: "#334155" }}>{n.message}</Text>
            <Text style={[s.muted, { fontSize: 12, marginTop: 4 }]}>{new Date(n.createdAt).toLocaleString("vi-VN")}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
