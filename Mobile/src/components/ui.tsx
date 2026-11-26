import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const colors = {
  primary: "#0d9488",
  primaryDark: "#0f766e",
  primarySoft: "#ccfbf1",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  card: "#ffffff",
  danger: "#e11d48",
  dangerSoft: "#ffe4e6",
  warn: "#b45309",
  warnSoft: "#fef3c7",
  ok: "#047857",
  okSoft: "#d1fae5",
};

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type ButtonProps = { title: string; onPress: () => void; variant?: "primary" | "outline" | "danger" | "dark"; disabled?: boolean; loading?: boolean; small?: boolean; style?: ViewStyle };
export function Button({ title, onPress, variant = "primary", disabled, loading, small, style }: ButtonProps) {
  const filled = variant !== "outline";
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : variant === "dark" ? "#1e293b" : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [s.button, small && s.buttonSmall, { backgroundColor: bg, borderColor: filled ? bg : colors.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={filled ? "#fff" : colors.primary} /> : <Text style={[s.buttonText, small && { fontSize: 13 }, { color: filled ? "#fff" : colors.text }]}>{title}</Text>}
    </Pressable>
  );
}

export function Badge({ text, tone = "gray" }: { text: string; tone?: "gray" | "green" | "orange" | "red" | "teal" }) {
  const map = { gray: ["#f1f5f9", "#475569"], green: [colors.okSoft, colors.ok], orange: [colors.warnSoft, colors.warn], red: [colors.dangerSoft, colors.danger], teal: [colors.primarySoft, colors.primaryDark] } as const;
  const [bg, fg] = map[tone];
  return <View style={[s.badge, { backgroundColor: bg }]}><Text style={[s.badgeText, { color: fg }]}>{text}</Text></View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" {...props} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }, props.style]} />
    </View>
  );
}

/** Hàng nút chọn 1 (loại ghi nhận, loại sự cố...) */
export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.chip, value === o.value && s.chipActive]}>
          <Text style={[s.chipText, value === o.value && { color: "#fff" }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Thanh tab ngang trong 1 màn (Lịch / Nhật ký / Chỉ số / Sự cố) */
export function Segments<T extends string>({ items, value, onChange }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.segments}>
      {items.map((it) => (
        <Pressable key={it.value} onPress={() => onChange(it.value)} style={[s.segment, value === it.value && s.segmentActive]}>
          <Text style={[s.segmentText, value === it.value && { color: "#fff" }]}>{it.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Notice({ text, tone = "ok" }: { text: string; tone?: "ok" | "error" | "warn" }) {
  const [bg, fg] = tone === "ok" ? [colors.okSoft, colors.ok] : tone === "warn" ? [colors.warnSoft, colors.warn] : [colors.dangerSoft, colors.danger];
  return <View style={[s.notice, { backgroundColor: bg }]}><Text style={{ color: fg, fontSize: 14 }}>{text}</Text></View>;
}

export const Loading = () => <View style={{ padding: 32 }}><ActivityIndicator color={colors.primary} /></View>;
export const Empty = ({ text }: { text: string }) => <Text style={s.empty}>{text}</Text>;
export const Muted = ({ children }: { children: React.ReactNode }) => <Text style={s.muted}>{children}</Text>;
export const Title = ({ children }: { children: React.ReactNode }) => <Text style={s.title}>{children}</Text>;

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: "#edf1f5", padding: 14, marginBottom: 12 },
  button: { minHeight: 46, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  buttonSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: "600" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: "#fff" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "500" },
  segments: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  segment: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 14, fontWeight: "600", color: colors.text },
  notice: { borderRadius: 10, padding: 12, marginBottom: 12 },
  empty: { textAlign: "center", color: colors.muted, paddingVertical: 24, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 13 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});

/* ---------- Thành phần gọn cho bản UI mới ---------- */
type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Vòng tròn chữ cái đầu tên (giống danh bạ điện thoại) */
export function Avatar({ name, active = true, size = 40 }: { name: string; active?: boolean; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts.length > 1 ? parts[parts.length - 2][0] : "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: active ? colors.primarySoft : "#f1f5f9", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: active ? colors.primaryDark : colors.muted, fontWeight: "700", fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

/** Đầu màn hình: ngày + lời chào + chuông thông báo */
export function Greeting({ name, unread = 0, onBell }: { name: string; unread?: number; onBell?: () => void }) {
  const insets = useSafeAreaInsets();
  const date = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
  return (
    <View style={[s.row, { justifyContent: "space-between", marginBottom: 16, marginTop: insets.top }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.muted}>{date.charAt(0).toUpperCase() + date.slice(1)}</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Chào {name}</Text>
      </View>
      {onBell && (
        <Pressable onPress={onBell} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unread > 0 && <View style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unread > 9 ? "9+" : unread}</Text></View>}
        </Pressable>
      )}
    </View>
  );
}

/** Ô số liệu nhỏ: icon + số + nhãn ngắn */
export function StatTile({ icon, value, label, tone = colors.text, onPress }: { icon: IconName; value: string | number; label: string; tone?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: "center" }}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={{ fontSize: 20, fontWeight: "800", color: tone, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </Pressable>
  );
}

/** Thanh tiến độ */
export function Progress({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: "#e2e8f0", overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: 6, backgroundColor: colors.primary }} />
    </View>
  );
}

/** Tiêu đề nhóm nội dung */
export const Section = ({ title, right }: { title: string; right?: React.ReactNode }) => (
  <View style={[s.row, { justifyContent: "space-between", marginTop: 8, marginBottom: 8 }]}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{title}</Text>{right}
  </View>
);

/** Dòng danh sách: avatar/icon trái, tên + 1 dòng phụ, phần phải */
export function ListRow({ left, title, sub, subTone, right, onPress, last }: { left?: React.ReactNode; title: string; sub?: string; subTone?: string; right?: React.ReactNode; onPress?: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={{ fontSize: 13, color: subTone ?? colors.muted }} numberOfLines={1}>{sub}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

/** Menu dòng có icon (màn Tôi, menu hành động) */
export function MenuRow({ icon, label, onPress, danger, badge, last }: { icon: IconName; label: string; onPress: () => void; danger?: boolean; badge?: number; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      <Text style={{ flex: 1, fontSize: 15, color: danger ? colors.danger : colors.text }}>{label}</Text>
      {!!badge && <Badge text={String(badge)} tone="red" />}
      {!danger && <Ionicons name="chevron-forward" size={18} color="#94a3b8" />}
    </Pressable>
  );
}
