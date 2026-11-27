import { Platform } from "react-native";
import { API_URL } from "./config";

/** BE luôn trả { success, message, data, errors } */
type Envelope<T> = { success: boolean; message?: string; data: T; errors?: string[] | Record<string, string[]> | null };

let token: string | null = null;
let onUnauthorized: () => void = () => {};

export const setToken = (value: string | null) => { token = value; };
// Màn hình con chạy effect trước AuthProvider: chờ đọc xong token đã lưu rồi mới gọi API
let markRestored: () => void = () => {};
const restored = new Promise<void>((resolve) => { markRestored = resolve; });
export const tokenRestored = () => markRestored();
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const messageOf = (body: Partial<Envelope<unknown>> | null, status: number) => {
  const errors = body?.errors;
  if (Array.isArray(errors) && errors.length) return errors.join("; ");
  if (errors && typeof errors === "object") {
    const list = Object.values(errors).flat().filter((x) => typeof x === "string");
    if (list.length) return list.join("; ");
  }
  return body?.message || (status === 0 ? "Không kết nối được máy chủ. Kiểm tra Wi-Fi và địa chỉ BE." : `Lỗi máy chủ (HTTP ${status}).`);
};

async function request<T>(method: string, path: string, body?: unknown, isForm = false): Promise<T> {
  await restored;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        Accept: "application/json",
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(messageOf(null, 0), 0);
  }
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError(json?.message || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
  }
  if (!res.ok || !json || json.success === false) throw new ApiError(messageOf(json, res.status), res.status);
  return json.data;
}

const query = (params?: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined);
  return entries.length ? "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&") : "";
};

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => request<T>("GET", path + query(params)),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  /** Ảnh chọn từ expo-image-picker. Trên web dùng File thật, trên điện thoại dùng { uri, name, type }. */
  upload: <T>(path: string, field: string, photos: { uri: string; fileName?: string | null; mimeType?: string | null; file?: File }[]) => {
    const form = new FormData();
    photos.forEach((p, i) => {
      if (Platform.OS === "web" && p.file) form.append(field, p.file);
      else form.append(field, { uri: p.uri, name: p.fileName || `anh-${Date.now()}-${i}.jpg`, type: p.mimeType || "image/jpeg" } as unknown as Blob);
    });
    if (Platform.OS === "web") return request<T>("POST", path, form, true);
    return uploadNative<T>(path, form);
  },
};

/**
 * Điện thoại: expo/fetch (mặc định từ Expo SDK 52+) không gửi được phần ảnh dạng { uri, name, type },
 * nên gửi ảnh qua XMLHttpRequest của React Native (đọc file trực tiếp từ uri camera / thư viện).
 */
async function uploadNative<T>(path: string, form: FormData): Promise<T> {
  await restored;
  const { status, text } = await new Promise<{ status: number; text: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL + path);
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 120_000;
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => resolve({ status: 0, text: "" });
    xhr.ontimeout = () => resolve({ status: 0, text: "" });
    xhr.send(form);
  });
  let json: Envelope<T> | null = null;
  try { json = JSON.parse(text) as Envelope<T>; } catch { json = null; }
  if (status === 401) {
    onUnauthorized();
    throw new ApiError(json?.message || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
  }
  if (status < 200 || status >= 300 || !json || json.success === false) throw new ApiError(messageOf(json, status), status);
  return json.data;
}

/** Ngày hôm nay theo giờ máy, dạng YYYY-MM-DD */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const timeLabel = (value?: string | null) => value ? new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
export const dateLabel = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });
