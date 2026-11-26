import { RoleTabs } from "@/components/TabsLayout";

export default function FamilyTabs() {
  return (
    <RoleTabs
      role="family"
      tabs={[
        { name: "index", title: "Tổng quan", icon: "home-outline", headerTitle: "Hôm nay" },
        { name: "elderly", title: "Người thân", icon: "people-outline" },
        { name: "packages", title: "Gói dịch vụ", icon: "pricetags-outline" },
        { name: "messages", title: "Tin nhắn", icon: "chatbubbles-outline" },
        { name: "me", title: "Tôi", icon: "person-circle-outline", headerTitle: "Tài khoản" },
      ]}
    />
  );
}
