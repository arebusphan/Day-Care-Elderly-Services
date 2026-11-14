import api from "./api";
import type { ApiResponse } from "../types/common";

export interface Conversation {
  conversationId: number;
  elderlyId: number;
  elderlyName: string;
  familyUserId: number;
  familyName: string;
  staffUserId: number;
  staffName: string;
  lastMessageAt: string | null;
  lastMessage: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  messageId: number;
  senderUserId: number;
  senderName: string;
  isMine: boolean;
  content: string;
  sentAt: string;
  readAt: string | null;
}

/** SR-38: nhắn tin gia đình ↔ nhân viên phụ trách */
export const messageService = {
  async conversations(): Promise<ApiResponse<Conversation[]>> {
    return (await api.get("/api/messages/conversations")).data;
  },
  async start(elderlyId: number): Promise<ApiResponse<{ conversationId: number }>> {
    return (await api.post("/api/messages/conversations", { elderlyId })).data;
  },
  async messages(conversationId: number): Promise<ApiResponse<ChatMessage[]>> {
    return (await api.get(`/api/messages/conversations/${conversationId}/messages`)).data;
  },
  async send(conversationId: number, content: string): Promise<ApiResponse<ChatMessage>> {
    return (await api.post(`/api/messages/conversations/${conversationId}/messages`, { content })).data;
  },
};

export default messageService;
