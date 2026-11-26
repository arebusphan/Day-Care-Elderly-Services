import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Card, colors, Empty, Loading, Notice, s } from "@/components/ui";
import { familyMoreApi } from "@/lib/services2";
import { money, type Invoice } from "@/lib/types2";

const statusText = { paid: "Đã thanh toán", pending: "Chờ thanh toán", refunded: "Đã hoàn" } as const;

/** Gia đình › Hóa đơn & chi phí */
export default function Invoices() {
  const [list, setList] = useState<Invoice[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setList(await familyMoreApi.invoices()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không tải được hóa đơn."); setList([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const paid = (list ?? []).filter((i) => i.status === "paid").reduce((sum, i) => sum + i.totalAmount, 0);
  const row = (k: string, v: string) => (
    <View key={k} style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}><Text style={s.muted}>{k}</Text><Text style={{ color: colors.text }}>{v}</Text></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
      {!!error && <Notice text={error} tone="error" />}
      {list && list.length > 0 && <Card><Text style={s.muted}>Tổng đã thanh toán</Text><Text style={[s.title, { color: colors.primary }]}>{money(paid)}</Text></Card>}
      {list === null ? <Loading /> : list.length === 0 ? <Empty text="Chưa có hóa đơn." /> : list.map((i) => (
        <Pressable key={i.id} onPress={() => setOpen(open === i.id ? null : i.id)}>
          <Card style={{ padding: 12 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", color: colors.text, flex: 1 }}>{i.packageName}</Text>
              <Badge text={statusText[i.status] ?? i.status} tone={i.status === "paid" ? "green" : i.status === "pending" ? "orange" : "gray"} />
            </View>
            <Text style={s.muted}>{i.elderlyName} · {i.serviceTypeLabel} · {i.createdAt}</Text>
            <Text style={{ fontWeight: "700", color: colors.primary, marginTop: 4 }}>{money(i.totalAmount)}</Text>
            {open === i.id && (
              <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
                {row("Mã hóa đơn", i.id)}
                {row("Mã đăng ký", i.registrationCode)}
                {!!i.invoiceVatNo && row("Số HĐ VAT", i.invoiceVatNo)}
                {row("Phòng", i.roomTypeLabel)}
                {row("Số ngày", String(i.totalDays))}
                {!!i.datesDescription && row("Thời gian", i.datesDescription)}
                {row("Giá gói", money(i.packagePrice))}
                {i.supportSurcharge > 0 && row("Phụ phí hỗ trợ", money(i.supportSurcharge))}
                {i.roomSurcharge > 0 && row("Phụ phí phòng nhỏ", money(i.roomSurcharge))}
                {row("Thanh toán", i.paymentMethod)}
              </View>
            )}
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
