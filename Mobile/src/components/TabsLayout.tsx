import Ionicons from "@expo/vector-icons/Ionicons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { roleOf, useAuth, type MobileRole } from "@/lib/auth";
import { colors, Loading } from "./ui";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
export type TabDef = { name: string; title: string; icon: IconName; headerTitle?: string; headerShown?: boolean };

/** Thanh tab dưới dùng chung cho Staff và Gia đình; sai vai trò thì về màn điều hướng. */
export function RoleTabs({ role, tabs }: { role: MobileRole; tabs: TabDef[] }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (roleOf(user) !== role) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#94a3b8",
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        headerTitleAlign: "left",
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            headerTitle: t.headerTitle ?? t.title,
            headerShown: t.headerShown ?? true,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={String(color)} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
