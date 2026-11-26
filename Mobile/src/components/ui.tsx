import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

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
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
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
