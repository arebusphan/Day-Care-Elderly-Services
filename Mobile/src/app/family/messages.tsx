import { useCallback } from "react";
import { ConversationList } from "@/components/ConversationList";
import { familyApi } from "@/lib/services";

/** Gia đình › Tin nhắn với nhân viên chăm sóc người thân */
export default function FamilyMessages() {
  const options = useCallback(async () => (await familyApi.elderly()).map((e) => ({ elderlyId: e.elderlyId, fullName: e.fullName })), []);
  return <ConversationList me="family" startOptions={options} />;
}
