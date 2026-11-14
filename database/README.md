# Database

- `schema-full.sql` — script tạo **toàn bộ** schema (33 bảng) sinh từ EF model hiện tại:
  `dotnet ef dbcontext script -p BE/DayCareElderlyService.Models -s BE/DayCareElderlyService.API -o database/schema-full.sql`.
  Dùng cho DB mới (chạy trên database rỗng). Đã kiểm tra chạy sạch trên SQL Server Express.
- DB đang có: không cần chạy tay — khi API khởi động, `OperationsSchema.EnsureAsync` áp dụng
  `BE/DayCareElderlyService.Models/Migrations/Apply_AddOperationsFeatures.sql` (idempotent) để thêm cột/bảng mới.
- Sinh lại `schema-full.sql` mỗi khi đổi entity / cấu hình DbContext.
