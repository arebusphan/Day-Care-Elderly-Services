import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Địa chỉ BE. Ưu tiên biến môi trường EXPO_PUBLIC_API_URL (đặt trong Mobile/.env).
 * Không có thì tự đoán: lấy IP máy đang chạy `npx expo start` (điện thoại dùng Expo Go cùng mạng Wi-Fi)
 * rồi gọi cổng 5075 của BE trên chính máy đó.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

const guessFromDevServer = () => {
  if (Platform.OS === "web") return "http://localhost:5075";
  const hostUri = Constants.expoConfig?.hostUri; // ví dụ "192.168.1.10:8081"
  const host = hostUri?.split(":")[0];
  return host ? `http://${host}:5075` : "http://localhost:5075";
};

export const API_URL = fromEnv || guessFromDevServer();
