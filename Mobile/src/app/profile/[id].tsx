import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card, Chips, colors, Field, Loading, Notice, s } from "@/components/ui";
import { Sheet } from "@/components/Sheet";
import { familyMoreApi } from "@/lib/services2";
import type { ElderlyProfile, SaveElderlyProfile } from "@/lib/types2";

const blank: SaveElderlyProfile = {
  fullName: "", dateOfBirth: "", gender: "Nam", relationship: "Bố", emergencyContactName: "", emergencyContactPhone: "",
  address: "", allergies: "", medicalHistory: "", medicalNotes: "", mobilityStatus: "Normal", careNotes: "",
};
const isSupport = (m?: string) => m === "Support" || m === "Cần hỗ trợ";
const toForm = (p: ElderlyProfile): SaveElderlyProfile => ({
  fullName: p.fullName, dateOfBirth: (p.dateOfBirth ?? "").slice(0, 10), gender: p.gender === "Nữ" ? "Nữ" : "Nam", relationship: p.relationship,
  emergencyContactName: p.emergencyContactName, emergencyContactPhone: p.emergencyContactPhone, address: p.address ?? "",
  allergies: p.allergies ?? "", medicalHistory: p.medicalHistory ?? "", medicalNotes: p.medicalNotes ?? "",
  mobilityStatus: isSupport(p.mobilityStatus) ? "Support" : "Normal", careNotes: p.careNotes ?? "",
});

/** Gia đình › Hồ sơ người thân: xem / thêm / sửa / xóa */
export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const [profile, setProfile] = useState<ElderlyProfile | null>(null);
  const [form, setForm] = useState<SaveElderlyProfile | null>(isNew ? { ...blank } : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew) return;
    familyMoreApi.profile(Number(id)).then(setProfile).catch((err) => setError(err instanceof Error ? err.message : "Không tải được hồ sơ."));
  }, [id, isNew]);

  const set = (k: keyof SaveElderlyProfile) => (v: string) => form && setForm({ ...form, [k]: v });

  const save = async () => {
    if (!form) return;
    if (!form.fullName.trim() || !form.emergencyContactName.trim() || !form.emergencyContactPhone.trim() || !form.relationship.trim()) { setError("Nhập đủ họ tên, quan hệ, người liên hệ khẩn cấp và số điện thoại."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth)) { setError("Ngày sinh dạng YYYY-MM-DD."); return; }
    if (!/^0\d{9}$/.test(form.emergencyContactPhone.trim())) { setError("Số điện thoại gồm 10 số, bắt đầu bằng 0."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      if (isNew) { await familyMoreApi.createProfile(form); router.back(); return; }
      const p = await familyMoreApi.updateProfile(Number(id), form);
      setProfile(p); setForm(null); setNotice("Đã lưu hồ sơ.");
    } catch (err) { setError(err instanceof Error ? err.message : "Không lưu được hồ sơ."); }
    finally { setSaving(false); }
  };

  const info = (k: string, v?: string | null) => (
    <View key={k} style={{ marginBottom: 8 }}><Text style={s.muted}>{k}</Text><Text style={{ color: colors.text, fontSize: 15 }}>{v || "—"}</Text></View>
  );

  return (
    <>
      <Stack.Screen options={{ title: isNew ? "Thêm người thân" : form ? "Sửa hồ sơ" : "Hồ sơ người thân" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!!error && <Notice text={error} tone="error" />}
        {!!notice && <Notice text={notice} />}
        {form ? (
          <Card>
            <Field label="Họ và tên" value={form.fullName} onChangeText={set("fullName")} />
            <Field label="Ngày sinh" value={form.dateOfBirth} onChangeText={set("dateOfBirth")} placeholder="YYYY-MM-DD" />
            <Text style={s.label}>Giới tính</Text>
            <Chips value={form.gender} onChange={set("gender")} options={[{ value: "Nam", label: "Nam" }, { value: "Nữ", label: "Nữ" }]} />
            <Text style={s.label}>Quan hệ với bạn</Text>
            <Chips value={form.relationship} onChange={set("relationship")} options={["Bố", "Mẹ", "Ông", "Bà", "Khác"].map((v) => ({ value: v, label: v }))} />
            <Field label="Địa chỉ" value={form.address} onChangeText={set("address")} />
            <Field label="Người liên hệ khẩn cấp" value={form.emergencyContactName} onChangeText={set("emergencyContactName")} />
            <Field label="SĐT khẩn cấp" value={form.emergencyContactPhone} onChangeText={set("emergencyContactPhone")} keyboardType="phone-pad" />
            <Text style={s.label}>Khả năng vận động</Text>
            <Chips value={form.mobilityStatus} onChange={set("mobilityStatus")} options={[{ value: "Normal", label: "Tự đi lại" }, { value: "Support", label: "Cần hỗ trợ" }]} />
            <Field label="Dị ứng" value={form.allergies} onChangeText={set("allergies")} />
            <Field label="Tiền sử bệnh" value={form.medicalHistory} onChangeText={set("medicalHistory")} multiline />
            <Field label="Ghi chú y tế" value={form.medicalNotes} onChangeText={set("medicalNotes")} multiline />
            <Field label="Lưu ý chăm sóc" value={form.careNotes} onChangeText={set("careNotes")} multiline />
            <View style={s.row}>
              <Button title="Hủy" variant="outline" onPress={() => (isNew ? router.back() : setForm(null))} style={{ flex: 1 }} />
              <Button title={isNew ? "Thêm" : "Lưu"} onPress={() => void save()} loading={saving} style={{ flex: 2 }} />
            </View>
          </Card>
        ) : !profile ? (error ? null : <Loading />) : (
          <>
            <Card>
              <Text style={[s.title, { marginBottom: 10 }]}>{profile.fullName}</Text>
              {info("Ngày sinh", `${(profile.dateOfBirth ?? "").slice(0, 10)}${profile.age ? ` (${profile.age} tuổi)` : ""}`)}
              {info("Giới tính", profile.gender)}
              {info("Quan hệ", profile.relationship)}
              {info("Địa chỉ", profile.address)}
              {info("Liên hệ khẩn cấp", `${profile.emergencyContactName} · ${profile.emergencyContactPhone}`)}
              {info("Vận động", isSupport(profile.mobilityStatus) ? "Cần hỗ trợ" : "Tự đi lại")}
              {info("Dị ứng", profile.allergies)}
              {info("Tiền sử bệnh", profile.medicalHistory)}
              {info("Ghi chú y tế", profile.medicalNotes)}
              {info("Lưu ý chăm sóc", profile.careNotes)}
            </Card>
            <Button title="Sửa hồ sơ" onPress={() => { setNotice(""); setForm(toForm(profile)); }} style={{ marginBottom: 10 }} />
            <Button title="Xóa hồ sơ" variant="danger" onPress={() => setConfirmDelete(true)} />
          </>
        )}
      </ScrollView>
      <Sheet visible={confirmDelete} title={`Xóa hồ sơ ${profile?.fullName ?? ""}?`} message="Không xóa được nếu người thân đang có gói dịch vụ." confirmText="Xóa" danger
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { await familyMoreApi.deleteProfile(Number(id)); setConfirmDelete(false); router.back(); }} />
    </>
  );
}
