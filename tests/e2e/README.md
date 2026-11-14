# Bộ test E2E

Chạy khi BE (`http://localhost:5075`) và FE (`http://localhost:5174`) đang chạy, DB local đã có dữ liệu mẫu.

```bash
cd tests/e2e
npm install
# tài khoản admin seed — KHÔNG ghi vào file
export ADMIN_EMAIL=... ADMIN_PASSWORD=...

# 1) Hợp đồng FE ↔ BE: gọi API bằng chính service FE (Vite SSR). Tạo tài khoản QA mới, ghi vào out/api.json
node api-e2e.mjs ../../FE/day-care-elderly-service out/api.json

# 2) Tính năng Đợt 2–4 (tổng quan, hồ sơ, người đón, báo vắng, tin nhắn, đơn nghỉ, AI phân ca, vật tư sự cố)
node api-e2e-features.mjs ../../FE/day-care-elderly-service out/api.json out/features.json

# 3) Smoke UI mọi role (Edge/Chrome headless; đổi bằng BROWSER_PATH), ảnh chụp vào out/ui
node ui-smoke.mjs out/api.json out/ui
```

Kết quả: in tổng `PASS/FAIL/ERROR/HTTP4xx`; mọi dòng không PASS được liệt kê. File `out/*.json` chứa mật khẩu tài khoản QA — đã nằm trong `.gitignore`.

Unit test BE: `cd BE/DayCareElderlyService.Tests && dotnet test`.
