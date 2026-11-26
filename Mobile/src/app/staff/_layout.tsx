import { RoleTabs } from "@/components/TabsLayout";

export default function StaffTabs() {
  return (
    <RoleTabs
      role="staff"
      tabs={[
        { name: "index", title: "Tổng quan", icon: "home-outline", headerTitle: "Ca trực hôm nay" },
        { name: "elderly", title: "Cụ hôm nay", icon: "people-outline" },
        { name: "medication", title: "Thuốc", icon: "medkit-outline", headerTitle: "Kế hoạch thuốc" },
        { name: "messages", title: "Tin nhắn", icon: "chatbubbles-outline" },
        { name: "me", title: "Tôi", icon: "person-circle-outline", headerTitle: "Tài khoản" },
      ]}
    />
  );
}
