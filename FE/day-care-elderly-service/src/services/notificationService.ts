import api from "./api";
import type { ApiResponse } from "../types/auth";

export interface NotificationItem {
  notificationId: number;
  title: string;
  message: string;
  notificationType: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  unreadCount: number;
  items: NotificationItem[];
}

const BASE = "/api/notifications";

export const notificationService = {
  async getMine(unreadOnly = false, take = 30): Promise<ApiResponse<NotificationList>> {
    const res = await api.get(BASE, { params: { unreadOnly, take } });
    return res.data;
  },

  async markRead(notificationId: number): Promise<ApiResponse<NotificationItem>> {
    const res = await api.patch(`${BASE}/${notificationId}/read`);
    return res.data;
  },

  async markAllRead(): Promise<ApiResponse<number>> {
    const res = await api.post(`${BASE}/read-all`);
    return res.data;
  },
};

export default notificationService;
