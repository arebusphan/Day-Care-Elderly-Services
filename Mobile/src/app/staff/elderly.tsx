import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, Chips, colors, Empty, Field, Loading, Notice, s } from "@/components/ui";
import { timeLabel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { staffApi } from "@/lib/services";
import type { Attendance, ElderlyInGroup, MyGroup, PickupPerson } from "@/lib/types";

/** Staff: các cụ được phân công hôm nay + điểm danh. Bấm vào cụ đã check-in để ghi care log. */
export default function StaffHome() {
  const { user } = useAuth();
  const [group, setGroup] = useState<MyGroup | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checkout, setCheckout] = useState<ElderlyInGroup | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const [g, a] = await Promise.all([staffApi.myGroup(), staffApi.attendance()]);
      setGroup(g);
      const mine = new Set(g.elderlyList.map((e) => e.elderlyId));
      setAttendance(a.filter((x) => mine.has(x.elderlyId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const checkIn = async (person: ElderlyInGroup) => {
    setBusy(person.elderlyId); setError(""); setNotice("");
    try { await staffApi.checkIn(person.elderlyId); setNotice(`Đã check-in ${person.fullName}.`); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Không check-in được."); }
    finally { setBusy(null); }
  };

  const people = group?.elderlyList ?? [];
  const byId = new Map(attendance.map((a) => [a.elderlyId, a]));
  const present = attendance.filter((a) => a.checkInAt && !a.checkOutAt).length;

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Text style={s.muted}>Xin chào {user?.fullName}</Text>
        <Text style={[s.title, { marginBottom: 12 }]}>{group?.groupName ?? "Nhóm của tôi"} · {new Date().toLocaleDateString("vi-VN")}</Text>
        <View style={[s.row, { marginBottom: 12 }]}>
          <Badge text={`${people.length} cụ được phân công`} tone="teal" />
          <Badge text={`${present} đang có mặt`} tone="green" />
        </View>
        {!!error && <Notice text={error} tone="error" />}
        {!!notice && <Notice text={notice} />}
        {loading ? <Loading /> : people.length === 0 ? <Empty text="Hôm nay bạn chưa được phân công cụ nào (kế hoạch chưa công bố?)." /> :
          people.map((person) => {
            const a = byId.get(person.elderlyId);
            const checkedIn = !!a?.checkInAt;
            const out = !!a?.checkOutAt;
            return (
              <Pressable key={person.elderlyId} disabled={!checkedIn} onPress={() => router.push({ pathname: "/care/[id]", params: { id: String(person.elderlyId), name: person.fullName } })}>
                <Card>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.title, { fontSize: 16 }]}>{person.fullName}</Text>
                      <Text style={s.muted}>{person.mobilityStatus === "Support" ? "Cần hỗ trợ" : "Bình thường"}{a?.checkInAt ? ` · Vào ${timeLabel(a.checkInAt)}` : ""}{a?.checkOutAt ? ` · Ra ${timeLabel(a.checkOutAt)}` : ""}</Text>
                    </View>
                    <Badge text={!checkedIn ? "Chưa đến" : out ? "Đã về" : "Có mặt"} tone={!checkedIn ? "gray" : out ? "orange" : "green"} />
                  </View>
                  {!!person.careNotes && <Text style={[s.muted, { marginTop: 6 }]}>{person.careNotes}</Text>}
                  <View style={[s.row, { marginTop: 10 }]}>
                    {!checkedIn && <Button small title="Check-in" onPress={() => void checkIn(person)} loading={busy === person.elderlyId} />}
                    {checkedIn && !out && <Button small title="Ghi care log ›" onPress={() => router.push({ pathname: "/care/[id]", params: { id: String(person.elderlyId), name: person.fullName } })} />}
                    {checkedIn && !out && <Button small variant="outline" title="Check-out" onPress={() => setCheckout(person)} />}
                  </View>
                </Card>
              </Pressable>
            );
          })}
      </ScrollView>
      <CheckoutModal person={checkout} onClose={() => setCheckout(null)} onDone={(msg) => { setCheckout(null); setNotice(msg); void load(); }} />
    </>
  );
}

/** BR-30: giao cụ cho người đón trong danh sách ủy quyền (đối chiếu 4 số cuối CCCD), hoặc ngoại lệ có lý do */
function CheckoutModal({ person, onClose, onDone }: { person: ElderlyInGroup | null; onClose: () => void; onDone: (msg: string) => void }) {
  const [persons, setPersons] = useState<PickupPerson[] | null>(null);
  const [pickId, setPickId] = useState<string>("");
  const [last4, setLast4] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onShow = async () => {
    setPersons(null); setPickId(""); setLast4(""); setReason(""); setError("");
    if (!person) return;
    try { setPersons(await staffApi.pickupPersons(person.elderlyId)); } catch { setPersons([]); }
  };

  const submit = async () => {
    if (!person) return;
    const override = pickId === "other";
    if (!override && pickId && !/^\d{4}$/.test(last4)) { setError("Nhập đúng 4 số cuối CCCD người đón."); return; }
    if (override && !reason.trim()) { setError("Nhập lý do giao cho người ngoài danh sách."); return; }
    setSaving(true); setError("");
    try {
      await staffApi.checkOut({ elderlyId: person.elderlyId, pickupPersonId: pickId && !override ? Number(pickId) : undefined, idCardLast4: !override && last4 ? last4 : undefined, overrideReason: override ? reason.trim() : undefined });
      onDone(`Đã check-out ${person.fullName}.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Không check-out được."); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={!!person} transparent animationType="slide" onShow={() => void onShow()} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.4)" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 }}>
          <Text style={s.title}>Check-out · {person?.fullName}</Text>
          <Text style={[s.muted, { marginBottom: 12 }]}>Chọn người đón trong danh sách ủy quyền của gia đình.</Text>
          {!!error && <Notice text={error} tone="error" />}
          {persons === null ? <Loading /> : (
            <Chips
              value={pickId}
              onChange={setPickId}
              options={[...persons.map((p) => ({ value: String(p.pickupPersonId), label: `${p.fullName}${p.relationship ? ` (${p.relationship})` : ""}` })), { value: "other", label: "Người khác (ngoại lệ)" }]}
            />
          )}
          {!!pickId && pickId !== "other" && <Field label="4 số cuối CCCD người đón" value={last4} onChangeText={setLast4} keyboardType="number-pad" maxLength={4} />}
          {pickId === "other" && <Field label="Lý do (gia đình và quản lý sẽ được báo)" value={reason} onChangeText={setReason} multiline />}
          <View style={[s.row, { marginTop: 8 }]}>
            <Button title="Hủy" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Xác nhận check-out" onPress={() => void submit()} loading={saving} disabled={!pickId && (persons?.length ?? 0) > 0} style={{ flex: 2 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
