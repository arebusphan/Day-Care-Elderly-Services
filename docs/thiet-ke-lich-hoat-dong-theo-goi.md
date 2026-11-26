# Thiết kế: Lịch hoạt động theo từng gói (đối tượng bệnh) + gắn vào Care log

> 26/11/2026 — **đã code** (nhánh feat/package-activity-schedule). Lịch mẫu seed bằng `PackageActivitySeeder` khi BE khởi động, chỉ cho gói chưa có hoạt động.
> Ký hiệu **(\*)** = thực hành chăm sóc thường quy, chưa có nghiên cứu chống lưng trong lượt tìm trước.

## 0. Hiện trạng

- Bảng `PackageActivities` có sẵn (gói, thứ, giờ bắt đầu/kết thúc, thứ tự, đang dùng) nhưng **0 dòng**, không có API, không có màn FE.
- Cột `ActivityTemplateId` trỏ tới bảng `ActivityTemplates` **đã bị xóa** (script `Apply_RemoveActivityAssignmentsAndTemplates.sql`) → cột thừa.
- Đối tượng bệnh hiện nằm ở **tên gói**: Cơ bản · Phục hồi chức năng · Sa sút trí tuệ · Sau tai biến · Giai đoạn cuối.
- Staff ghi "Hoạt động" bằng chữ tự do, không gắn với lịch → không biết việc nào đã làm / chưa làm.

## 1. Database (0 bảng mới, sửa 3 bảng)

### 1.1 `PackageActivities` — thêm cột

| Cột mới | Kiểu | Ý nghĩa |
|---|---|---|
| `ActivityName` | nvarchar(150) NOT NULL | Tên hoạt động: "Vật lý trị liệu", "Đo chỉ số sáng"… |
| `Purpose` | nvarchar(500) NULL | Để làm gì cho cụ (hiện cho staff + gia đình) |
| `CareType` | nvarchar(30) NOT NULL | Loại care log khi ghi: MEAL / ACTIVITY / VITALS / MEDICATION / MOOD / NAP / HYGIENE / NOTE |
| `TargetMinutes` | int NULL | Số phút mục tiêu (để cộng phút/tuần) |
| `PerformerRole` | nvarchar(20) NOT NULL DEFAULT 'Any' | `Nurse` (điều dưỡng) / `Caregiver` (hộ lý) / `Any` |
| `IsRequired` | bit NOT NULL DEFAULT 1 | Bắt buộc làm (tính vào "chưa làm") hay tùy chọn |
| `Source` | nvarchar(200) NULL | Nguồn nghiên cứu (WHO, NICE…) — dùng cho báo cáo |
| `ConditionCode` | nvarchar(30) NULL | NULL = áp cho mọi cụ của gói. Có giá trị (vd `DIABETES`) = **chỉ hiện cho cụ có bệnh nền đó** |

- `DayOfWeek`: **NULL = mọi ngày T2–T7**; 1 = T2 … 6 = T7 (trung tâm nghỉ CN, khớp `BillingService`).
- `ActivityTemplateId`: giữ cột (không phá dữ liệu), bỏ khỏi code mới.

### 1.2 `CareLogs` — thêm 1 cột

| Cột mới | Kiểu | Ý nghĩa |
|---|---|---|
| `PackageActivityId` | int NULL, FK → PackageActivities | Mục ghi này hoàn thành hoạt động nào trong lịch |

- Bỏ qua hoạt động: ghi CareLog `CareType = SKIP` + `PackageActivityId` + lý do trong `Description`.
- **Trạng thái** 1 hoạt động trong ngày (tính, không lưu): có CareLog gắn → *Đã làm*; có SKIP → *Bỏ qua*; chưa có và quá giờ kết thúc → *Trễ*; còn lại → *Chưa làm*.

### 1.3 `ElderlyMembers` — thêm 1 cột (bệnh nền có mã)

| Cột mới | Kiểu | Ý nghĩa |
|---|---|---|
| `ChronicConditions` | nvarchar(200) NULL | Mã bệnh nền, phân cách dấu phẩy: `DIABETES`, `HYPERTENSION`, `HEART` (vd `"DIABETES,HYPERTENSION"`) |

- Lý do: `MedicalHistory` hiện là chữ tự do ("Tiểu đường type 2…"), không lọc lịch được chắc chắn.
- Ai nhập: Center khi sửa hồ sơ cụ (checkbox 3 bệnh). Gia đình khai trong `MedicalHistory` như cũ, quản lý chọn mã sau khi xem.
- Lọc lịch: hoạt động có `ConditionCode` chỉ hiện khi mã đó có trong `ChronicConditions` của cụ.

### 1.4 Cách áp dụng

Theo đúng cách nhóm đang làm: script idempotent `Apply_AddPackageActivitySchedule.sql` trong `Models/Migrations/`, gọi từ `OperationsSchema.EnsureAsync` khi BE khởi động; cập nhật `database/schema-full.sql`. Seed lịch mẫu (mục 4) chạy cùng script, chỉ chèn khi gói chưa có hoạt động.

### 1.5 Gói nào áp cho cụ hôm nay

Lấy `ServiceRegistrations` của cụ có `Status = 'Confirmed'` và `StartDate ≤ hôm nay ≤ EndDate` → `PackageId` → lịch của gói đó (lọc `DayOfWeek` NULL hoặc = thứ hôm nay, `IsActive = 1`, và `ConditionCode` NULL hoặc nằm trong `ChronicConditions` của cụ).

## 2. API (BE)

| Method | Route | Ai | Làm gì |
|---|---|---|---|
| GET | `/api/center/packages/{packageId}/activities` | Center, Admin | Lịch mẫu của gói |
| POST | `/api/center/packages/{packageId}/activities` | Center, Admin | Thêm hoạt động (kiểm tra giờ kết thúc > bắt đầu, CareType hợp lệ) |
| PUT | `/api/center/package-activities/{id}` | Center, Admin | Sửa |
| PUT | `/api/center/elderly/{id}` *(sửa)* | Center, Admin | DTO thêm `ChronicConditions` (chỉ nhận DIABETES / HYPERTENSION / HEART) |
| PATCH | `/api/center/package-activities/{id}/active` | Center, Admin | Ẩn/hiện (không xóa cứng để giữ lịch sử care log) |
| GET | `/api/staff/care-logs/{elderlyId}/schedule?date=` | Staff | Lịch hôm nay của cụ + trạng thái từng hoạt động + CareLog đã gắn |
| GET | `/api/staff/care-logs/{elderlyId}/schedule/week?date=` | Staff | Tổng kết tuần: phút đã làm / mục tiêu, số buổi theo hoạt động |
| POST | `/api/staff/care-logs/{elderlyId}` *(sửa)* | Staff | DTO thêm `PackageActivityId?`; chấp nhận thêm `SKIP` |
| GET | `/api/family/care-logs/{elderlyId}/schedule?date=` | Family | Lịch + trạng thái (ẩn ghi chú nội bộ) |

Quy tắc giữ nguyên: chỉ cụ thuộc nhóm mình (BR-33), đã check-in, ngày chưa chốt. Thêm: `PackageActivityId` phải thuộc gói của cụ và đúng thứ hôm nay.

## 3. FE

| Màn | Thay đổi |
|---|---|
| Center › **Hồ sơ người cao tuổi** (sửa) | Thêm 3 ô chọn bệnh nền: Tiểu đường · Tăng huyết áp · Tim mạch → lưu `ChronicConditions` |
| Center/Admin › **Lịch Trực & Hoạt Động** (đang là khung trống) | Chọn gói → bảng theo giờ, lọc theo thứ; thêm / sửa / ẩn hoạt động; cột Mục đích, Người làm, Phút mục tiêu |
| Staff › **Carelog** | Thêm tab **"Lịch hôm nay"** (đặt đầu tiên): danh sách hoạt động theo giờ, nhãn Đã làm / Chưa làm / Trễ / Bỏ qua. Nút **Ghi** mở form có sẵn loại + gắn hoạt động; nút **Bỏ qua** hỏi lý do (hộp thoại trong trang). Đầu tab: "6/9 hoạt động · VLTL tuần này 2/3 buổi" |
| Gia đình › **Theo dõi sức khỏe** | Thẻ "Hoạt động hôm nay: 6/9 đã làm" + danh sách hoạt động với mục đích |

## 4. Lịch mẫu cho 5 gói (seed)

Khung giờ trung tâm 07:00–16:30, T2–T7. **Khung chung** chèn cho cả 5 gói:

| Giờ | Hoạt động | CareType | Người làm | Mục đích |
|---|---|---|---|---|
| 07:00–07:45 | Đón cụ, ăn sáng | MEAL | Hộ lý | Bắt đầu ngày đúng giờ, đủ dinh dưỡng |
| 07:45–08:15 | Đo chỉ số sáng, nhắc thuốc | VITALS | Điều dưỡng | Phát hiện bất thường trước khi vận động |
| 08:15–08:45 | Dưỡng sinh, thở, khởi động khớp | ACTIVITY (30′) | Hộ lý | Giảm cứng khớp buổi sáng |
| 11:00–12:00 | Ăn trưa | MEAL | Hộ lý | Theo chế độ ăn của cụ |
| 12:00–13:30 | Nghỉ trưa | NAP | Hộ lý | Phục hồi sức |
| 15:00–15:30 | Ăn xế | MEAL | Hộ lý | |
| 15:30–16:30 | Thư giãn, chốt care log, trả cụ | NOTE | Bất kỳ | Bàn giao cho gia đình |

### 4.1 Cơ bản (vận động được)

| Thứ | Giờ | Hoạt động | CareType | Phút | Mục đích | Nguồn |
|---|---|---|---|---|---|---|
| T2-4-6 | 08:45–09:30 | Sức mạnh + thăng bằng (đứng lên ngồi xuống, kiễng gót, đi nối gót) | ACTIVITY | 45 | Phòng té ngã | WHO: ≥3 ngày/tuần |
| T3-5-7 | 08:45–09:15 | Đi bộ nhanh vừa sức | ACTIVITY | 30 | Tim mạch | WHO: ≥150 phút/tuần |
| Mọi ngày | 09:30–10:30 | Đọc báo, cờ, cắm hoa | ACTIVITY | 60 | Giữ trí não, giao tiếp | MSD (bằng chứng ít) |
| Mọi ngày | 10:30–11:00 | Đi bộ sân vườn, uống nước | ACTIVITY | 30 | Vận động thêm, đủ nước (\*) | |
| Mọi ngày | 14:00–15:00 | Âm nhạc, trò chơi nhóm | ACTIVITY | 60 | Tinh thần | MSD |

**Thêm cho cụ có bệnh nền (cùng gói Cơ bản, lọc theo `ConditionCode`):**

| Bệnh | Thứ | Giờ | Hoạt động | CareType | Người | Mục đích | Nguồn |
|---|---|---|---|---|---|---|---|
| DIABETES | Mọi ngày | 07:00–07:15 | Đo đường huyết lúc đói (trước ăn sáng) | VITALS | ĐD | Theo dõi để chỉnh thuốc | Joslin |
| DIABETES | Mọi ngày | 07:15–07:45 | Ăn sáng ít đường (thực đơn riêng) | MEAL | HL | Giữ đường huyết ổn định | |
| DIABETES | Theo ngày tập | 08:40–08:45 | Đo đường huyết **trước tập**: <5 mmol/L ăn nhẹ trước; >16,7 mmol/L **không tập** | VITALS | ĐD | Tránh hạ/tăng đường huyết khi tập | IHS |
| DIABETES | Theo ngày tập | 09:30–09:40 | Đo đường huyết **sau tập** | VITALS | ĐD | Phát hiện hạ đường huyết sau tập | IHS |
| DIABETES | T3-5-7 | 09:40–10:10 | Kiểm tra bàn chân (vết xước, đỏ, tê) | NOTE | HL | Phòng loét bàn chân (\*) | |
| HYPERTENSION | Mọi ngày | 13:30–14:00 | Đo huyết áp chiều | VITALS | ĐD | So sánh với buổi sáng (\*) | |
| HYPERTENSION | Mọi ngày | 11:00–12:00 | Ăn trưa ít muối | MEAL | HL | Giữ huyết áp ổn định (\*) | |

- BE thêm quy tắc (đã làm): đường huyết > 16,7 mmol/L → cảnh báo "Không cho cụ tập vận động hôm nay". Staff bấm **Bỏ qua** buổi tập và ghi lý do (BE không tự bỏ qua, để staff quyết định).
- Ngưỡng cảnh báo chỉ số hiện vẫn chung cho mọi cụ (ngoài phạm vi thiết kế này).

Mục tiêu tuần: ≥150 phút ACTIVITY vận động, ≥3 buổi sức mạnh/thăng bằng.

### 4.2 Phục hồi chức năng

| Thứ | Giờ | Hoạt động | CareType | Phút | Người | Mục đích | Nguồn |
|---|---|---|---|---|---|---|---|
| Mọi ngày | 07:45–08:15 | Đo chỉ số + hỏi mức đau 0–10 | VITALS | | ĐD | Chọn mức tập hôm đó (\*) | |
| T2-4-6 | 08:45–10:00 | Vật lý trị liệu (gập duỗi gối, nâng chân, tập đi khung/nạng, lên xuống bậc) | ACTIVITY | 75 | ĐD | Đi lại, tự sinh hoạt | Thử nghiệm: 45–90′ × 3 buổi/tuần |
| T3-5-7 | 08:45–09:15 | Tập nhẹ duy trì | ACTIVITY | 30 | ĐD | Không tập quá nặng (dễ bỏ tập) | Cochrane |
| Mọi ngày | 10:30–11:00 | Đi bộ có người dìu | ACTIVITY | 30 | HL | Tập đi tình huống thật | |
| Mọi ngày | 14:00–15:00 | Ngâm chân, massage chân | ACTIVITY | 30 | HL | Thư giãn cơ (\*) | |

Mục tiêu tuần: 3 buổi VLTL.

### 4.3 Sa sút trí tuệ

| Thứ | Giờ | Hoạt động | CareType | Phút | Mục đích | Nguồn |
|---|---|---|---|---|---|---|
| Mọi ngày | 07:00–08:30 | Ăn sáng + đo chỉ số **gần cửa sổ, ánh sáng tự nhiên** | MEAL | | Giảm kích động, đi lang thang | Tổng quan 2022 (Guu) |
| T2, T5 | 08:45–10:15 | Kích thích nhận thức (CST) | ACTIVITY | 90 | Giữ trí nhớ, suy nghĩ | Trials 50–90′, 1–2 buổi/tuần |
| T3 | 08:45–09:15 | Liệu pháp hồi tưởng (ảnh cũ, kể chuyện) | ACTIVITY | 30 | Tăng giao tiếp | Cochrane |
| T4, T6 | 08:45–09:30 | Âm nhạc theo sở thích | ACTIVITY | 45 | Giảm trầm cảm, rối loạn hành vi | Cochrane |
| T7 | 08:45–09:45 | Cắm hoa, thủ công | ACTIVITY | 60 | Cụ thấy mình có ích (\*) | |
| Mọi ngày | 10:30–11:00 | Đi bộ có người kèm | ACTIVITY | 30 | Vận động, an toàn | |
| Mọi ngày | 14:00–15:00 | Việc quen tay, tránh ồn | ACTIVITY | 60 | | |
| Mọi ngày | 15:00–16:30 | Theo dõi đổi tính về chiều (bồn chồn, đòi về) | MOOD | | Phát hiện "hội chứng hoàng hôn" | Dementia UK |

Mục tiêu tuần: CST 2 buổi.

### 4.4 Sau tai biến

| Thứ | Giờ | Hoạt động | CareType | Phút | Người | Mục đích | Nguồn |
|---|---|---|---|---|---|---|---|
| Mọi ngày | 07:00–07:15 | Kiểm tra dấu hiệu tái phát (nói khó, yếu tay tăng, méo miệng) | NOTE | | ĐD | Chuyển viện kịp (\*) | |
| Mọi ngày | 07:15–07:45 | Ăn sáng: **kiểm tra nuốt**, thức ăn mềm, chỗ yên tĩnh | MEAL | | HL | Tránh sặc, viêm phổi | ASA, Canada |
| Mọi ngày | 08:15–08:45 | Tập thụ động bên liệt | ACTIVITY | 30 | HL | Chống co rút | |
| Mọi ngày | 08:45–09:45 | Vật lý trị liệu (thăng bằng, tập đi, sức cơ bên liệt) | ACTIVITY | 60 | ĐD | Đi lại được | NICE: PT 1–2 giờ/ngày |
| Mọi ngày | 09:45–10:30 | Hoạt động trị liệu + tập nói (cầm thìa, cài nút, đọc to) | ACTIVITY | 45 | ĐD | Tự ăn, tự mặc, giao tiếp | NICE |
| Mọi ngày | 10:30–11:00 | Đi bộ có người dìu bên liệt | ACTIVITY | 30 | HL | Phòng té | |
| Mọi ngày | 12:00–13:30 | Đổi tư thế, đặt tay chân bên liệt | NOTE | | HL | Chống đau vai, loét (\*) | |
| Mọi ngày | 13:30–14:00 | Đo huyết áp chiều | VITALS | | ĐD | Huyết áp cao tăng nguy cơ tái phát (\*) | |
| Mọi ngày | 14:00–15:00 | Tập đợt 2 (VLTL hoặc HĐTL) | ACTIVITY | 60 | ĐD | Gần 3 giờ/ngày | NICE ≥3h × 5 ngày/tuần |

Mục tiêu: ≥5 ngày/tuần có tập; tổng phút tập/ngày hiển thị so với 180′ (mức tối đa — trung tâm ban ngày khó đạt).

### 4.5 Giai đoạn cuối — **chưa có nghiên cứu, cần bổ sung nguồn**

| Thứ | Giờ | Hoạt động | CareType | Người | Mục đích |
|---|---|---|---|---|---|
| Mọi ngày | 09:00, 11:00, 13:00, 15:00 | Đổi tư thế, kiểm tra da | NOTE | HL | Chống loét (\*) |
| Mọi ngày | 10:00 / 14:00 | Đánh giá đau, khó thở | VITALS | ĐD | Giữ cụ dễ chịu (\*) |
| Mọi ngày | 10:30 | Chăm sóc miệng, vệ sinh | HYGIENE | HL | Thoải mái (\*) |
| Mọi ngày | 14:30–15:00 | Nghe nhạc, gia đình gọi video | ACTIVITY | HL | Tinh thần (\*) |

(Gói này không áp khung chung "dưỡng sinh" và "đi bộ".)

## 5. Cần bạn quyết định

1. ~~Bệnh mãn tính~~ → **Đã chốt 26/11: giữ trong gói Cơ bản**, lọc bằng `PackageActivities.ConditionCode` + `ElderlyMembers.ChronicConditions` (mục 1.3, 4.1).
2. Gói **Giai đoạn cuối**: giữ lịch (\*) như trên hay để trống chờ nguồn?
3. Ai được sửa lịch: chỉ **Center (quản lý)** hay cả Admin? (đề xuất: cả hai)

## 6. Ước lượng

| Phần | Việc | Ước tính |
|---|---|---|
| DB | Script Apply + seed + cập nhật schema-full, entity | 0,5 ngày |
| BE | 8 API + kiểm tra quy tắc + tính trạng thái/tuần + unit test | 1,5 ngày |
| FE | Màn quản lý lịch, tab "Lịch hôm nay", thẻ gia đình | 2 ngày |
| Test | Chạy lại luồng thật như lần test 26/11 | 0,5 ngày |
