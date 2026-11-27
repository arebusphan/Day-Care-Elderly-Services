import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { messageApi } from "@/lib/services2";
import type { Conversation } from "@/lib/types2";
import { Avatar, Badge, Card, colors, Empty, ListRow, Loading, Notice, Section } from "./ui";

/**
 * Tab Tin nhắn: mỗi hội thoại gắn 1 cụ (gia đình ↔ nhân viên phụ trách).
 * startOptions: các cụ có thể bắt đầu hội thoại (gia đình: người thân; staff: cụ trong nhóm).
 */
export function ConversationList({ me, startOptions }: { me: "staff" | "family"; startOptions: () => Promise<{ elderlyId: number; fullName: string }[]> }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [options, setOptions] = useState<{ elderlyId: number; fullName: string }[]>([]);
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
  const start = async (elderlyId: number) => {
    setError("");
    try {
      // BE chỉ trả conversationId: tải lại danh sách để có tên gia đình / nhân viên rồi mở
      const { conversationId } = await messageApi.start(elderlyId);
      const list = await messageApi.conversations();
      setItems(list);
      setOptions((o) => o.filter((x) => x.elderlyId !== elderlyId));
      const c = list.find((x) => x.conversationId === conversationId);
      if (c) open(c);
      else router.push({ pathname: "/chat/[id]", params: { id: String(conversationId), title: options.find((o) => o.elderlyId === elderlyId)?.fullName ?? "Tin nhắn" } });
    }
    catch (err) { setError(err instanceof Error ? err.message : "Không mở được hội thoại."); }
  };
  const when = (v: string | null) => {
    if (!v) return "";
    const d = new Date(v);
    return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {loading ? <Loading /> : (
        <>
          {items.length > 0 && (
            <Card style={{ paddingVertical: 4 }}>
              {items.map((c, i) => {
                const other = me === "staff" ? c.familyName : c.staffName;
                return (
                  <ListRow key={c.conversationId} last={i === items.length - 1} onPress={() => open(c)}
                    left={<Avatar name={other} />}
                    title={`${other} · ${c.elderlyName}`}
                    sub={c.lastMessage ?? "Chưa có tin nhắn"} subTone={c.unreadCount > 0 ? colors.text : undefined}
                    right={<View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{when(c.lastMessageAt)}</Text>
                      {c.unreadCount > 0 && <Badge text={String(c.unreadCount)} tone="red" />}
                    </View>} />
                );
              })}
            </Card>
          )}
          {items.length === 0 && options.length === 0 && <Empty text="Chưa có hội thoại." />}
          {options.length > 0 && (
            <>
              <Section title="Nhắn tin mới" />
              <Card style={{ paddingVertical: 4 }}>
                {options.map((o, i) => (
                  <ListRow key={o.elderlyId} last={i === options.length - 1} onPress={() => void start(o.elderlyId)}
                    left={<Avatar name={o.fullName} active={false} />}
                    title={o.fullName} sub={me === "staff" ? "Nhắn gia đình" : "Nhắn nhân viên phụ trách"}
                    right={<Ionicons name="create-outline" size={20} color={colors.primary} />} />
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
