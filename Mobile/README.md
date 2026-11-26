# DayCare Mobile (Expo / React Native)

App di động cho **Nhân viên (Staff)** và **Gia đình (FamilyMember)**. Dùng chung API với web (`../BE`). Admin và Quản lý dùng web.

| Vai trò | Chức năng |
|---|---|
| Staff | Cụ được phân công hôm nay, check-in / check-out (đối chiếu người đón), **Lịch hôm nay** theo gói (Ghi / Bỏ qua), ghi nhật ký kèm **chụp ảnh**, sửa nhật ký của mình, đo chỉ số, thuốc hôm nay, sự cố, xác nhận y tế và chốt ngày |
| Gia đình | Danh sách người thân + tiến độ hôm nay, hoạt động theo lịch, nhật ký 7 ngày (có ảnh), chỉ số & thuốc 30 ngày, sự cố |

Công nghệ: Expo SDK 58, Expo Router (`src/app`), TypeScript, `expo-secure-store` (lưu token), `expo-image-picker` (camera / thư viện ảnh).

## Chạy trên điện thoại bằng Expo Go

1. Cài **Expo Go** trên điện thoại (App Store / CH Play). Điện thoại và máy tính **cùng một mạng Wi-Fi**.
2. Chạy BE và cho BE nghe trên mạng LAN (không chỉ `localhost`):
   ```bash
   dotnet run --project ../BE/DayCareElderlyService.API -- --urls http://0.0.0.0:5075
   ```
   Lần đầu Windows có thể hỏi cho phép `dotnet` qua tường lửa: chọn **Private network** (mạng riêng).
3. Cài thư viện và chạy app:
   ```bash
   npm install
   npx expo start
   ```
4. Quét mã QR trong terminal bằng camera (iPhone) hoặc bằng Expo Go (Android).

App tự tìm BE theo IP của máy đang chạy `npx expo start` (cổng 5075). Nếu màn đăng nhập báo "Không kết nối được máy chủ", tạo file `.env` từ `.env.example`, điền IP LAN của máy chạy BE (`ipconfig` → IPv4), rồi chạy lại `npx expo start --clear`. Địa chỉ máy chủ đang dùng hiện ở cuối màn đăng nhập.

## Chạy thử trên trình duyệt

```bash
npx expo start --web
```
BE cần cho phép origin `http://localhost:8081` trong `Cors:AllowedOrigins`. Bản web lưu token bằng `localStorage`, chụp ảnh dùng hộp chọn file.

## Cấu trúc

```
src/app/            màn hình (Expo Router)
  login.tsx           đăng nhập
  index.tsx           điều hướng theo vai trò
  staff/index.tsx     cụ hôm nay + điểm danh
  staff/[id].tsx      care log 1 cụ: Lịch / Nhật ký / Chỉ số & thuốc / Sự cố
  family/index.tsx    người thân
  family/[id].tsx     theo dõi 1 người thân
src/lib/            config (địa chỉ BE), api (fetch + token), services (endpoint), auth, types, labels
src/components/     ui (nút, thẻ, ô nhập...), EntryCard, Sheet (hộp thoại xác nhận / nhập lý do)
```

Kiểm tra kiểu: `npm run typecheck`.
