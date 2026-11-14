/** Ngày hôm nay theo giờ máy (yyyy-MM-dd) — tránh lệch ngày của toISOString() (UTC) */
export function localToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const DAY_NAMES = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** "2026-11-14" → "Thứ Bảy, 14/11/2026" */
export function formatDateVN(dStr: string): string {
  const d = new Date(dStr.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dStr;
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${DAY_NAMES[d.getDay()]}, ${date}`;
}

/** ISO datetime → "14/11/2026 08:30" */
export function formatDateTimeVN(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
