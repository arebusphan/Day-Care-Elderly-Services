import { MeScreen } from "@/components/MeScreen";

export default function StaffMe() {
  return <MeScreen extra={[{ label: "Lịch làm việc & đơn nghỉ / đổi ca", icon: "calendar-outline", href: "/schedule" }]} />;
}
