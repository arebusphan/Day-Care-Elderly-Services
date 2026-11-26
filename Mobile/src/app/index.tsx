import { Redirect } from "expo-router";
import { Text, View } from "react-native";
import { Button, Loading, s } from "@/components/ui";
import { roleOf, useAuth } from "@/lib/auth";

/** Điều hướng theo vai trò: Staff → danh sách cụ hôm nay; Gia đình → người thân */
export default function Index() {
  const { user, ready, logout } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  const role = roleOf(user);
  if (role === "staff") return <Redirect href="/staff" />;
  if (role === "family") return <Redirect href="/family" />;
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
      <Text style={s.title}>Ứng dụng di động dành cho Nhân viên và Gia đình</Text>
      <Text style={s.muted}>Tài khoản {user.email} ({user.roles.join(", ")}) vui lòng dùng trang web.</Text>
      <Button title="Đăng xuất" variant="outline" onPress={() => void logout()} />
    </View>
  );
}
