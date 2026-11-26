import { useCallback } from "react";
import { ConversationList } from "@/components/ConversationList";
import { staffApi } from "@/lib/services";

/** Staff › Tin nhắn với gia đình các cụ trong nhóm */
export default function StaffMessages() {
  const options = useCallback(async () => (await staffApi.myGroup()).elderlyList.map((e) => ({ elderlyId: e.elderlyId, fullName: e.fullName })), []);
  return <ConversationList me="staff" startOptions={options} />;
}
