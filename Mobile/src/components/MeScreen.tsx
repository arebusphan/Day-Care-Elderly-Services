import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { accountApi } from "@/lib/services2";
import { Avatar, Badge, Card, colors, MenuRow, s } from "./ui";

type Item = { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; href: string; badge?: string };

/** Tab "Tôi": thông tin tài khoản, lối tắt (lịch, hóa đơn...), thông báo, đổi mật khẩu, đăng xuất */
export function MeScreen({ extra }: { extra: Item[] }) {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    accountApi.notifications(true, 1).then((r) => setUnread(r.unreadCount)).catch(() => setUnread(0));
  }, []));

  const items: Item[] = [
    ...extra,
    { label: "Thông báo", icon: "notifications-outline", href: "/notifications", badge: unread ? String(unread) : undefined },
    { label: "Đổi mật khẩu", icon: "key-outline", href: "/password" },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <View style={s.row}>
          <Avatar name={user?.fullName ?? "?"} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{user?.fullName}</Text>
            <Text style={s.muted}>{user?.email}</Text>
            <View style={{ marginTop: 4 }}><Badge text={user?.roles.includes("Staff") ? "Nhân viên" : "Gia đình"} tone="teal" /></View>
          </View>
        </View>
      </Card>
      <Card style={{ padding: 0 }}>
        {items.map((it, i) => (
          <Pressable key={it.href} onPress={() => router.push(it.href as never)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderColor: colors.border, backgroundColor: pressed ? "#f1f5f9" : "transparent" }]}>
            <Ionicons name={it.icon} size={22} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>{it.label}</Text>
            {it.badge && <Badge text={it.badge} tone="red" />}
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </Pressable>
        ))}
      </Card>
      <Card style={{ paddingVertical: 0 }}>
        <MenuRow icon="log-out-outline" label="Đăng xuất" danger last onPress={() => void logout().then(() => router.replace("/login"))} />
      </Card>
    </ScrollView>
  );
}
