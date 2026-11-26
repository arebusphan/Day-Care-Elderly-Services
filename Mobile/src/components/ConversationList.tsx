import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { messageApi } from "@/lib/services2";
import type { Conversation } from "@/lib/types2";
import { Badge, Button, Card, Chips, colors, Empty, Loading, Notice, s } from "./ui";

/**
 * Tab Tin nhắn: mỗi hội thoại gắn 1 cụ (gia đình ↔ nhân viên phụ trách).
 * startOptions: các cụ có thể bắt đầu hội thoại (gia đình: người thân; staff: cụ trong nhóm).
 */
export function ConversationList({ me, startOptions }: { me: "staff" | "family"; startOptions: () => Promise<{ elderlyId: number; fullName: string }[]> }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [options, setOptions] = useState<{ elderlyId: number; fullName: string }[]>([]);
  const [pick, setPick] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, opts] = await Promise.all([messageApi.conversations(), startOptions().catch(() => [])]);
      setItems(list);
      setOptions(opts.filter((o) => !list.some((c) => c.elderlyId === o.elderlyId)));
    } catch (err) { setError(err instanceof Error ? err.message : "Không tải được tin nhắn."); }
    finally { setLoading(false); }
  }, [startOptions]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const open = (c: Conversation) => router.push({ pathname: "/chat/[id]", params: { id: String(c.conversationId), title: `${c.elderlyName} · ${me === "staff" ? c.familyName : c.staffName}` } });
  const start = async () => {
    if (!pick) return;
    try { const c = await messageApi.start(Number(pick)); setPick(""); open(c); }
    catch (err) { setError(err instanceof Error ? err.message : "Không mở được hội thoại."); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {options.length > 0 && (
        <Card>
          <Text style={[s.title, { fontSize: 15, marginBottom: 8 }]}>Nhắn tin mới về</Text>
          <Chips value={pick} onChange={setPick} options={options.map((o) => ({ value: String(o.elderlyId), label: o.fullName }))} />
          <Button small title={me === "staff" ? "Nhắn gia đình" : "Nhắn nhân viên phụ trách"} onPress={() => void start()} disabled={!pick} />
        </Card>
      )}
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Chưa có hội thoại nào." /> : items.map((c) => (
        <Pressable key={c.conversationId} onPress={() => open(c)}>
          <Card style={{ padding: 12 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{c.elderlyName}</Text>
              {c.unreadCount > 0 && <Badge text={`${c.unreadCount} mới`} tone="red" />}
            </View>
            <Text style={s.muted}>{me === "staff" ? `Gia đình: ${c.familyName}` : `Nhân viên: ${c.staffName}`}</Text>
            {!!c.lastMessage && <Text numberOfLines={1} style={{ marginTop: 4, color: "#334155" }}>{c.lastMessage}</Text>}
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
