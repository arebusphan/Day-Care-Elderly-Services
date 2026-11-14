import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquare, Plus, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import messageService from "../services/messageService";
import type { ChatMessage, Conversation } from "../services/messageService";
import { formatDateTimeVN } from "../lib/date";

interface Props {
  /** "family": mở cuộc trò chuyện theo người thân; "center": nhân viên / quản lý trả lời */
  mode: "family" | "center";
  /** Danh sách người thân để gia đình bắt đầu trò chuyện */
  elderlyOptions?: { elderlyId: number; fullName: string }[];
}

const POLL_MS = 15_000;
const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** SR-38: nhắn tin theo ngữ cảnh người cao tuổi giữa gia đình và nhân viên phụ trách */
export function MessagesView({ mode, elderlyOptions = [] }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [startFor, setStartFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    try {
      const res = await messageService.conversations();
      setConvs(res.data ?? []);
      setActive((cur) => cur ?? res.data?.[0]?.conversationId ?? null);
    } catch {
      /* im lặng khi poll */
    }
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    try {
      const res = await messageService.messages(id);
      setMessages(res.data ?? []);
    } catch (err) {
      toast.error(errMsg(err, "Không tải được tin nhắn."));
    }
  }, []);

  useEffect(() => {
    loadConvs();
    const t = window.setInterval(loadConvs, POLL_MS);
    return () => window.clearInterval(t);
  }, [loadConvs]);

  useEffect(() => {
    if (active === null) return;
    loadMessages(active);
    const t = window.setInterval(() => loadMessages(active), POLL_MS);
    return () => window.clearInterval(t);
  }, [active, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const current = convs.find((c) => c.conversationId === active) ?? null;
  const startItems = useMemo(
    () => elderlyOptions.map((e) => ({ value: String(e.elderlyId), label: e.fullName })),
    [elderlyOptions],
  );

  const start = async () => {
    if (!startFor) return;
    try {
      const res = await messageService.start(Number(startFor));
      if (!res.success || !res.data) throw new Error(res.message);
      await loadConvs();
      setActive(res.data.conversationId);
      setStartFor(null);
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không mở được cuộc trò chuyện."));
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (active === null || !text.trim()) return;
    setSending(true);
    try {
      const res = await messageService.send(active, text.trim());
      if (!res.success || !res.data) throw new Error(res.message);
      setMessages((m) => [...m, res.data!]);
      setText("");
      loadConvs();
    } catch (err) {
      toast.error(errMsg(err, (err as Error)?.message || "Không gửi được."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm"><MessageSquare className="size-4" /> Cuộc trò chuyện</CardTitle>
          {mode === "family" && startItems.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Select items={startItems} value={startFor} onValueChange={(v) => setStartFor(v as string | null)}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Nhắn về người thân..." /></SelectTrigger>
                <SelectContent>
                  {startItems.map((it) => <SelectItem key={it.value} value={it.value}>{it.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" onClick={start} disabled={!startFor} title="Bắt đầu"><Plus /></Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {convs.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">Chưa có cuộc trò chuyện nào.</p>
          ) : (
            <ul className="divide-y">
              {convs.map((c) => (
                <li key={c.conversationId}>
                  <button
                    type="button"
                    onClick={() => setActive(c.conversationId)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-muted ${c.conversationId === active ? "bg-muted" : ""}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{c.elderlyName}</span>
                      {c.unreadCount > 0 && <Badge variant="destructive">{c.unreadCount}</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {mode === "family" ? `Phụ trách: ${c.staffName}` : `Gia đình: ${c.familyName}`}
                    </span>
                    {c.lastMessage && <span className="block truncate text-xs text-muted-foreground">{c.lastMessage}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card size="sm" className="min-h-[420px]">
        {current ? (
          <>
            <CardHeader>
              <CardTitle className="text-sm">{current.elderlyName}</CardTitle>
              <CardDescription>
                {mode === "family" ? `Nhân viên phụ trách: ${current.staffName}` : `Gia đình: ${current.familyName} · đang giao cho ${current.staffName}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <div className="max-h-[380px] min-h-[240px] flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Hãy gửi tin nhắn đầu tiên.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.messageId} className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.isMine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                        {!m.isMine && <p className="text-[11px] font-semibold opacity-80">{m.senderName}</p>}
                        <p className="whitespace-pre-line">{m.content}</p>
                        <p className="mt-1 text-[10px] opacity-70">{formatDateTimeVN(m.sentAt)}{m.isMine && m.readAt ? " · đã xem" : ""}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="flex items-end gap-2">
                <Textarea
                  rows={2}
                  className="flex-1"
                  placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                  value={text}
                  maxLength={2000}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button type="submit" disabled={sending || !text.trim()}>
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  Gửi
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex h-full items-center justify-center py-16 text-sm text-muted-foreground">
            Chọn một cuộc trò chuyện.
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default MessagesView;
