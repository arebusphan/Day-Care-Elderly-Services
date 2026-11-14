import { useEffect, useState } from "react";
import MessagesView from "../../components/MessagesView";
import elderlyService from "../../services/elderlyService";

/** Tin nhắn phía gia đình: chọn người thân để bắt đầu trò chuyện với nhân viên phụ trách */
export function FamilyMessagesView() {
  const [options, setOptions] = useState<{ elderlyId: number; fullName: string }[]>([]);

  useEffect(() => {
    elderlyService
      .getMyElderlyProfiles()
      .then((res) => setOptions((res.data ?? []).map((e) => ({ elderlyId: e.elderlyId, fullName: e.fullName }))))
      .catch(() => setOptions([]));
  }, []);

  return <MessagesView mode="family" elderlyOptions={options} />;
}

export default FamilyMessagesView;
