import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { careTypeLabels, dataFieldLabels, formatField, HIDDEN_FIELDS, readWarnings } from "@/lib/labels";
import { timeLabel } from "@/lib/api";
import type { CareLogEntry } from "@/lib/types";
import { Badge, colors, s } from "./ui";

/** Hiện 1 mục care log: loại, giờ, nội dung, chỉ số (nhãn tiếng Việt), cảnh báo, ảnh */
export function EntryCard({ entry, action, onOpenPhoto }: { entry: CareLogEntry; action?: React.ReactNode; onOpenPhoto?: (url: string) => void }) {
  const warnings = readWarnings(entry.data);
  const fields = Object.entries(entry.data ?? {}).filter(([k, v]) => !HIDDEN_FIELDS.has(k) && v !== null && v !== undefined && v !== "");
  return (
    <View style={[s.card, { padding: 12 }]}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <View style={s.row}>
          <Badge text={careTypeLabels[entry.careType] ?? entry.careType} tone="teal" />
          {entry.isInternal && <Badge text="Nội bộ" tone="orange" />}
        </View>
        <View style={s.row}>
          <Text style={s.muted}>{timeLabel(entry.recordedAt)}</Text>
          {action}
        </View>
      </View>
      <Text style={{ marginTop: 8, fontSize: 15, color: colors.text }}>{entry.description}</Text>
      {!!entry.notes && <Text style={{ marginTop: 4, color: "#475569" }}>{entry.notes}</Text>}
      {warnings.length > 0 && (
        <View style={{ marginTop: 8, backgroundColor: colors.warnSoft, borderRadius: 8, padding: 8 }}>
          {warnings.map((w) => <Text key={w} style={{ color: colors.warn, fontSize: 13 }}>⚠ {w}</Text>)}
        </View>
      )}
      {fields.length > 0 && (
        <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {fields.map(([k, v]) => <Text key={k} style={{ fontSize: 12, color: "#334155", backgroundColor: "#f1f5f9", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>{dataFieldLabels[k]?.label ?? k}: {formatField(k, v)}</Text>)}
        </View>
      )}
      {entry.photos?.length > 0 && (
        <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {entry.photos.map((p) => (
            <Pressable key={p.photoId} onPress={() => onOpenPhoto?.(p.url)}>
              <Image source={{ uri: p.url }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor: "#e2e8f0" }} />
            </Pressable>
          ))}
        </View>
      )}
      <Text style={[s.muted, { marginTop: 6, fontSize: 12 }]}>Ghi bởi {entry.staffName || "Nhân viên"}</Text>
    </View>
  );
}
