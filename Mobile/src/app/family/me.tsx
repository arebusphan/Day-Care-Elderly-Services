import { MeScreen } from "@/components/MeScreen";

export default function FamilyMe() {
  return <MeScreen extra={[{ label: "Hóa đơn & chi phí", icon: "receipt-outline", href: "/invoices" }]} />;
}
