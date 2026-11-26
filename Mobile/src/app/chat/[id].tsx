import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from "react-native";
import { Button, colors, Loading, Notice, s } from "@/components/ui";
import { messageApi } from "@/lib/services2";
import type { ChatMessage } from "@/lib/types2";

/** Màn chat 1 hội thoại; tự làm mới mỗi 10 giây */
export default function Chat() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const conversationId = Number(id);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    try { setMessages(await messageApi.messages(conversationId)); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được tin nhắn."); }
  }, [conversationId]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try { await messageApi.send(conversationId, content); setText(""); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Không gửi được."); }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: title ?? "Tin nhắn" }} />
      {!!error && <View style={{ padding: 12 }}><Notice text={error} tone="error" /></View>}
      {messages === null ? <Loading /> : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.messageId)}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Text style={[s.muted, { textAlign: "center", padding: 24 }]}>Chưa có tin nhắn. Hãy gửi tin đầu tiên.</Text>}
          renderItem={({ item }) => (
            <View style={{ alignSelf: item.isMine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              {!item.isMine && <Text style={[s.muted, { fontSize: 11, marginBottom: 2 }]}>{item.senderName}</Text>}
              <View style={{ backgroundColor: item.isMine ? colors.primary : "#fff", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, borderWidth: item.isMine ? 0 : 1, borderColor: colors.border }}>
                <Text style={{ color: item.isMine ? "#fff" : colors.text, fontSize: 15 }}>{item.content}</Text>
              </View>
              <Text style={[s.muted, { fontSize: 10, marginTop: 2, alignSelf: item.isMine ? "flex-end" : "flex-start" }]}>{new Date(item.sentAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</Text>
            </View>
          )}
        />
      )}
      <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: colors.border, backgroundColor: "#fff" }}>
        <TextInput value={text} onChangeText={setText} placeholder="Nhập tin nhắn..." placeholderTextColor="#94a3b8" multiline style={[s.input, { flex: 1, maxHeight: 100 }]} />
        <Button title="Gửi" onPress={() => void send()} loading={sending} disabled={!text.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}
