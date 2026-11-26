import { router } from "expo-router";
import { useState } from "react";
import { ScrollView } from "react-native";
import { Button, Field, Notice } from "@/components/ui";
import { accountApi } from "@/lib/services2";

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError("");
    if (!current || !next) { setError("Nhập đủ mật khẩu hiện tại và mật khẩu mới."); return; }
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) { setError("Mật khẩu mới tối thiểu 8 ký tự, có cả chữ và số."); return; }
    if (next !== confirm) { setError("Nhập lại mật khẩu mới chưa khớp."); return; }
    setSaving(true);
    try { await accountApi.changePassword({ currentPassword: current, newPassword: next, confirmNewPassword: confirm }); setDone(true); setCurrent(""); setNext(""); setConfirm(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Không đổi được mật khẩu."); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {!!error && <Notice text={error} tone="error" />}
      {done && <Notice text="Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới." />}
      <Field label="Mật khẩu hiện tại" value={current} onChangeText={setCurrent} secureTextEntry />
      <Field label="Mật khẩu mới (≥ 8 ký tự, có chữ và số)" value={next} onChangeText={setNext} secureTextEntry />
      <Field label="Nhập lại mật khẩu mới" value={confirm} onChangeText={setConfirm} secureTextEntry />
      <Button title="Đổi mật khẩu" onPress={() => void submit()} loading={saving} />
      {done && <Button title="Quay lại" variant="outline" onPress={() => router.back()} style={{ marginTop: 10 }} />}
    </ScrollView>
  );
}
