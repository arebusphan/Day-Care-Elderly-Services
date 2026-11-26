import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Text, View } from "react-native";
import { Button, Field, Notice, s } from "./ui";

/**
 * Hộp thoại dưới màn hình: xác nhận, hoặc xác nhận kèm 1 ô nhập (lý do bỏ qua, kết quả xử lý sự cố...).
 * Dùng thay Alert.alert vì Alert có nút không chạy trên bản web.
 */
export function Sheet({
  visible, title, message, inputLabel, inputPlaceholder, confirmText = "Xác nhận", danger, onCancel, onConfirm,
}: {
  visible: boolean;
  title: string;
  message?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  confirmText?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (visible) { setText(""); setError(""); setSaving(false); } }, [visible]);

  const confirm = async () => {
    if (inputLabel && !text.trim()) { setError(`Vui lòng nhập ${inputLabel.toLowerCase()}.`); return; }
    setSaving(true); setError("");
    try { await onConfirm(text.trim()); }
    catch (err) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra."); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.4)" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 }}>
          <Text style={[s.title, { marginBottom: 6 }]}>{title}</Text>
          {!!message && <Text style={[s.muted, { marginBottom: 12, fontSize: 14 }]}>{message}</Text>}
          {!!error && <Notice text={error} tone="error" />}
          {!!inputLabel && <Field label={inputLabel} value={text} onChangeText={setText} placeholder={inputPlaceholder} multiline autoFocus />}
          <View style={[s.row, { marginTop: 4 }]}>
            <Button title="Hủy" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
            <Button title={confirmText} variant={danger ? "dark" : "primary"} onPress={() => void confirm()} loading={saving} style={{ flex: 2 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
