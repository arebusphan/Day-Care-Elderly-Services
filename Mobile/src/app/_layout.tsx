import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/components/ui";

/**
 * Stack gốc: 2 nhóm tab (staff, family) + các màn chi tiết mở đè lên tab (ẩn thanh tab khi vào chi tiết).
 */
export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          headerBackTitle: "Quay lại",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="staff" options={{ headerShown: false }} />
        <Stack.Screen name="family" options={{ headerShown: false }} />
        <Stack.Screen name="care/[id]" options={{ title: "Chăm sóc" }} />
        <Stack.Screen name="follow/[id]" options={{ title: "Theo dõi" }} />
        <Stack.Screen name="chat/[id]" options={{ title: "Tin nhắn" }} />
        <Stack.Screen name="medication/[id]" options={{ title: "Kế hoạch thuốc" }} />
        <Stack.Screen name="schedule" options={{ title: "Lịch & đơn nghỉ" }} />
        <Stack.Screen name="notifications" options={{ title: "Thông báo" }} />
        <Stack.Screen name="password" options={{ title: "Đổi mật khẩu" }} />
        <Stack.Screen name="profile/[id]" options={{ title: "Hồ sơ người thân" }} />
        <Stack.Screen name="manage/[id]" options={{ title: "Đón, vắng & điểm danh" }} />
        <Stack.Screen name="register" options={{ title: "Đăng ký gói" }} />
        <Stack.Screen name="invoices" options={{ title: "Hóa đơn & chi phí" }} />
      </Stack>
    </AuthProvider>
  );
}
