import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Lưu token / thông tin đăng nhập: SecureStore trên điện thoại, localStorage khi chạy bản web để thử. */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.setItem(key, value); } catch { /* bỏ qua */ }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try { globalThis.localStorage?.removeItem(key); } catch { /* bỏ qua */ }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
