import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Button, colors, Field, Notice, s } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/config";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) { setError("Nhập email và mật khẩu."); return; }
    setLoading(true); setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>D</Text>
          </View>
          <Text style={[s.title, { fontSize: 22, marginTop: 12 }]}>DayCare</Text>
          <Text style={s.muted}>Dành cho nhân viên chăm sóc và gia đình</Text>
        </View>
        {!!error && <Notice text={error} tone="error" />}
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="ten@email.com" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={() => void submit()} />
        <Button title="Đăng nhập" onPress={() => void submit()} loading={loading} style={{ marginTop: 4 }} />
        <Text style={[s.muted, { textAlign: "center", marginTop: 24, fontSize: 12 }]}>Máy chủ: {API_URL}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
