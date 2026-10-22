import React, { useState, useEffect } from "react";
import elderlyService from "../../services/elderlyService";
import type { ElderlyProfileDto, CreateElderlyProfileDto } from "../../types/elderly";

interface ElderlyProfileViewProps {
  onNavigateToServices?: () => void;
}

export const ElderlyProfileView: React.FC<ElderlyProfileViewProps> = ({ onNavigateToServices }) => {
  const [elderlyList, setElderlyList] = useState<ElderlyProfileDto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State tạo mới hoặc chỉnh sửa hồ sơ
  const [formData, setFormData] = useState<CreateElderlyProfileDto>({
    fullName: "",
    dateOfBirth: "",
    gender: "Nam",
    relationship: "Bố",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
    allergies: "",
    medicalHistory: "",
    medicalNotes: "",
    mobilityStatus: "Bình thường",
    careNotes: "",
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Tải danh sách hồ sơ từ Backend khi vào trang
  const fetchElderlyProfiles = async () => {
    setIsLoading(true);
    try {
      const res = await elderlyService.getMyElderlyProfiles();
      if (res.success && res.data) {
        setElderlyList(res.data);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách hồ sơ người cao tuổi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElderlyProfiles();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form trước khi submit
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Vui lòng nhập họ và tên người cao tuổi.";
    }
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = "Vui lòng chọn ngày sinh.";
    }
    if (!formData.relationship.trim()) {
      errors.relationship = "Vui lòng chọn mối quan hệ.";
    }
    if (!formData.emergencyContactName.trim()) {
      errors.emergencyContactName = "Vui lòng nhập tên người liên hệ.";
    }
    if (!formData.emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = "Vui lòng nhập số điện thoại người liên hệ.";
    } else if (!/^0\d{9,10}$/.test(formData.emergencyContactPhone.trim())) {
      errors.emergencyContactPhone = "Số điện thoại không hợp lệ (gồm 10-11 số bắt đầu từ số 0).";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      fullName: "",
      dateOfBirth: "",
      gender: "Nam",
      relationship: "Bố",
      emergencyContactName: "",
      emergencyContactPhone: "",
      address: "",
      allergies: "",
      medicalHistory: "",
      medicalNotes: "",
      mobilityStatus: "Bình thường",
      careNotes: "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = () => {
    const current = elderlyList[selectedIndex];
    if (!current) return;

    setIsEditMode(true);
    setFormData({
      fullName: current.fullName || "",
      dateOfBirth: current.dateOfBirth || "",
      gender: current.gender === "Nữ" ? "Nữ" : "Nam",
      relationship: current.relationship || "Bố",
      emergencyContactName: current.emergencyContactName || "",
      emergencyContactPhone: current.emergencyContactPhone || "",
      address: current.address || "",
      allergies: current.allergies || "",
      medicalHistory: current.medicalHistory || "",
      medicalNotes: getCleanMedicalNotes(current.medicalNotes),
      mobilityStatus: current.mobilityStatus === "Cần hỗ trợ" ? "Cần hỗ trợ" : "Bình thường",
      careNotes: getCleanCareNotes(current.careNotes),
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Submit Lưu (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setAlertMessage(null);

    try {
      if (isEditMode) {
        const current = elderlyList[selectedIndex];
        const res = await elderlyService.updateElderlyProfile(current.elderlyId, formData);
        if (res.success && res.data) {
          setAlertMessage({ type: "success", text: "Cập nhật hồ sơ người cao tuổi thành công!" });
          setElderlyList((prev) =>
            prev.map((item) => (item.elderlyId === current.elderlyId ? res.data! : item))
          );
          setShowModal(false);
        } else {
          setAlertMessage({ type: "error", text: res.message || "Cập nhật thất bại." });
        }
      } else {
        const res = await elderlyService.createElderlyProfile(formData);
        if (res.success && res.data) {
          setAlertMessage({ type: "success", text: "Tạo hồ sơ người cao tuổi thành công!" });
          setElderlyList((prev) => [res.data!, ...prev]);
          setSelectedIndex(0);
          setShowModal(false);
        } else {
          setAlertMessage({ type: "error", text: res.message || "Tạo hồ sơ thất bại." });
        }
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors ? err.response.data.errors.join(", ") : null) ||
        err.message ||
        "Lỗi kết nối tới máy chủ khi lưu hồ sơ.";
      setAlertMessage({ type: "error", text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa hồ sơ
  const handleDeleteConfirm = async () => {
    const current = elderlyList[selectedIndex];
    if (!current) return;

    setIsSubmitting(true);
    try {
      const res = await elderlyService.deleteElderlyProfile(current.elderlyId);
      if (res.success) {
        setAlertMessage({ type: "success", text: `Đã xóa hồ sơ cụ ${current.fullName} thành công.` });
        const updatedList = elderlyList.filter((item) => item.elderlyId !== current.elderlyId);
        setElderlyList(updatedList);
        setSelectedIndex(0);
        setShowDeleteConfirm(false);
      } else {
        setAlertMessage({ type: "error", text: res.message || "Xóa hồ sơ thất bại." });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Lỗi khi xóa hồ sơ người cao tuổi.";
      setAlertMessage({ type: "error", text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lọc bỏ JSON nếu dữ liệu cũ còn lưu JSON
  const getCleanMedicalNotes = (rawNotes?: string) => {
    if (!rawNotes) return "";
    const trimmed = rawNotes.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.MedicalNotes || "";
      } catch {
        return "";
      }
    }
    return rawNotes;
  };

  const getCleanCareNotes = (rawCare?: string) => {
    if (!rawCare) return "";
    const trimmed = rawCare.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.CareNotes || "";
      } catch {
        return "";
      }
    }
    return rawCare;
  };

  const current = elderlyList[selectedIndex];
  const displayMedicalNotes = current ? getCleanMedicalNotes(current.medicalNotes) : "";
  const displayCareNotes = current ? getCleanCareNotes(current.careNotes) : "";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 font-sans">
      {/* Thông báo Alert */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            alertMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{alertMessage.text}</span>
          <button
            onClick={() => setAlertMessage(null)}
            className="text-xs font-bold px-2 py-0.5 hover:opacity-75"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Thanh công cụ: Chọn hồ sơ & Thêm hồ sơ mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Hồ sơ gia đình ({elderlyList.length}):
          </span>
          {elderlyList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {elderlyList.map((elderly, idx) => (
                <button
                  key={elderly.elderlyId}
                  onClick={() => setSelectedIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedIndex === idx
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {elderly.fullName} ({elderly.relationship})
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition self-start sm:self-auto"
        >
          + Thêm Người Thân Mới
        </button>
      </div>

      {/* Trạng thái đang tải */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu hồ sơ...</p>
        </div>
      ) : elderlyList.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
          <h3 className="text-base font-bold text-slate-800">Chưa có hồ sơ người cao tuổi nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Gia đình chưa tạo hồ sơ cho người thân. Vui lòng bấm vào nút bên dưới để tạo hồ sơ người cao tuổi và đăng ký gói dịch vụ.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 inline-block px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition"
          >
            + Tạo Hồ Sơ Ngay
          </button>
        </div>
      ) : (
        /* ================= KHUNG FORM HỒ SƠ NGƯỜI CAO TUỔI ================= */
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
          {/* Header của Khung Form */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-md">
                  Phiếu Tiếp Nhận & Quản Lý Hồ Sơ
                </span>
                <span className="text-xs text-slate-400">
                  Mã: <b className="text-slate-700">{current.elderlyId.slice(0, 8).toUpperCase()}</b>
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">
                {current.fullName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quan hệ với bạn: <b className="text-slate-800">{current.relationship}</b> | Trạng thái:{" "}
                <span className="text-emerald-700 font-bold">Đang theo dõi tại viện</span>
              </p>
            </div>

            {/* Các nút thao tác phụ trên form */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleOpenEditModal}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition shadow-2xs"
              >
                Chỉnh Sửa
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
              >
                Xóa
              </button>
            </div>
          </div>

          {/* Nội dung các trường trong Form */}
          <div className="p-6 sm:p-8 space-y-8 text-xs">
            {/* KHỐI 1: THÔNG TIN CÁ NHÂN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                  1
                </span>
                <span>Thông Tin Cá Nhân & Nhân Khẩu</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Họ và tên:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{current.fullName}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Ngày sinh:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {current.dateOfBirth || "Chưa cập nhật"}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Giới tính:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{current.gender || "Không rõ"}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Mối quan hệ:</span>
                  <span className="font-bold text-blue-700 text-sm mt-0.5 block">{current.relationship}</span>
                </div>

                <div className="sm:col-span-2 md:col-span-4 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Địa chỉ thường trú:</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {current.address || "Chưa cập nhật địa chỉ"}
                  </span>
                </div>
              </div>
            </div>

            {/* KHỐI 2: THÔNG TIN NGƯỜI LIÊN HỆ KHẨN CẤP */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                  2
                </span>
                <span>Thông Tin Người Liên Hệ Khẩn Cấp</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Họ tên người liên hệ:</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {current.emergencyContactName}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 font-medium block">Số điện thoại liên hệ:</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                    {current.emergencyContactPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* KHỐI 3: THÔNG TIN SỨC KHỎE & BỆNH LÝ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                  3
                </span>
                <span>Thông Tin Sức Khỏe & Tiền Sử Bệnh</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 bg-rose-50/70 border border-rose-200/90 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase text-rose-700 block">
                    Tình trạng dị ứng (Thức ăn / Thuốc / Môi trường):
                  </span>
                  <p className="font-semibold text-rose-900 leading-relaxed">
                    {current.allergies ? current.allergies : "Không ghi nhận dị ứng đặc biệt"}
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold uppercase text-amber-800 block">
                    Tiền sử bệnh lý (Huyết áp, tim mạch, tiểu đường...):
                  </span>
                  <p className="font-semibold text-amber-950 leading-relaxed">
                    {current.medicalHistory ? current.medicalHistory : "Chưa có tiền sử bệnh lý ghi nhận"}
                  </p>
                </div>

                <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Ghi chú sức khỏe khác:
                  </span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {displayMedicalNotes ? displayMedicalNotes : "Không có ghi chú y tế bổ sung."}
                  </p>
                </div>
              </div>
            </div>

            {/* KHỐI 4: THÔNG TIN CHĂM SÓC & VẬN ĐỘNG */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider pb-1.5 border-b border-slate-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                  4
                </span>
                <span>Khả Năng Vận Động & Yêu Cầu Chăm Sóc</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Khả năng di chuyển:
                  </span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                      current.mobilityStatus === "Cần hỗ trợ"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {current.mobilityStatus}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {current.mobilityStatus === "Cần hỗ trợ"
                      ? "Cần điều dưỡng hỗ trợ di chuyển, sinh hoạt hoặc lên xuống giường."
                      : "Người cao tuổi có thể tự đi lại bình thường trong sinh hoạt hàng ngày."}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Ghi chú chăm sóc đặc biệt:
                  </span>
                  <p className="font-medium text-slate-700 leading-relaxed">
                    {displayCareNotes ? displayCareNotes : "Không có yêu cầu chăm sóc đặc biệt."}
                  </p>
                </div>
              </div>
            </div>

            {/* ================= NÚT ĐĂNG KÝ GÓI DỊCH VỤ NỔI BẬT DƯỚI CÙNG ================= */}
            <div className="pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 p-5 rounded-2xl border border-blue-100">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Chăm Sóc Ban Ngày & Nghỉ Ngơi Cho Cụ {current.fullName}
                </span>
                <span className="text-[11px] text-slate-500">
                  Lựa chọn gói bán trú dinh dưỡng, theo dõi y tế và chọn loại giường nghỉ trưa phù hợp (Giường thường 4-6 người hoặc Giường VIP 1-2 người)
                </span>
              </div>

              <button
                type="button"
                onClick={onNavigateToServices}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer whitespace-nowrap self-stretch sm:self-auto text-center"
              >
                Đăng Ký Gói Dịch Vụ Cho Cụ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TẠO MỚI / CHỈNH SỬA ================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isEditMode ? "Chỉnh Sửa Hồ Sơ Người Cao Tuổi" : "Tạo Hồ Sơ Người Cao Tuổi Mới"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEditMode
                    ? "Cập nhật lại thông tin cá nhân, sức khỏe hoặc chăm sóc"
                    : "Điền thông tin cá nhân, sức khỏe và chăm sóc để trung tâm lưu trữ hồ sơ"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* PHẦN 1 */}
              <div className="space-y-4">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Phần 1: Thông Tin Cá Nhân
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Họ và tên người cao tuổi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Nhập họ và tên cụ..."
                      className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition ${
                        formErrors.fullName ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-blue-500"
                      }`}
                    />
                    {formErrors.fullName && <p className="text-rose-500 text-[11px] mt-1">{formErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ngày sinh <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition ${
                        formErrors.dateOfBirth ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-blue-500"
                      }`}
                    />
                    {formErrors.dateOfBirth && <p className="text-rose-500 text-[11px] mt-1">{formErrors.dateOfBirth}</p>}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Giới tính <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-4 pt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Nam"
                          checked={formData.gender === "Nam"}
                          onChange={handleInputChange}
                        />
                        <span>Nam</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Nữ"
                          checked={formData.gender === "Nữ"}
                          onChange={handleInputChange}
                        />
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mối quan hệ với bạn <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="relationship"
                      value={formData.relationship}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="Bố">Bố ruột</option>
                      <option value="Mẹ">Mẹ ruột</option>
                      <option value="Ông">Ông nội / Ông ngoại</option>
                      <option value="Bà">Bà nội / Bà ngoại</option>
                      <option value="Vợ/Chồng">Vợ / Chồng</option>
                      <option value="Người thân khác">Người thân khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Địa chỉ thường trú</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ""}
                      onChange={handleInputChange}
                      placeholder="Số nhà, tên đường, quận/huyện..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Họ tên người liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleInputChange}
                      placeholder="Tên người nhà liên hệ khẩn cấp..."
                      className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition ${
                        formErrors.emergencyContactName ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-blue-500"
                      }`}
                    />
                    {formErrors.emergencyContactName && (
                      <p className="text-rose-500 text-[11px] mt-1">{formErrors.emergencyContactName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      SĐT người liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: 0912345678"
                      className={`w-full px-3 py-2 border rounded-lg text-xs outline-none transition ${
                        formErrors.emergencyContactPhone ? "border-rose-400 bg-rose-50/30" : "border-slate-300 focus:border-blue-500"
                      }`}
                    />
                    {formErrors.emergencyContactPhone && (
                      <p className="text-rose-500 text-[11px] mt-1">{formErrors.emergencyContactPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* PHẦN 2 */}
              <div className="space-y-4 pt-3 border-t border-slate-200">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Phần 2: Thông Tin Sức Khỏe
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tình trạng dị ứng (Thức ăn, thuốc, thời tiết)
                    </label>
                    <input
                      type="text"
                      name="allergies"
                      value={formData.allergies || ""}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: Dị ứng tôm cua, kháng sinh..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tiền sử bệnh lý (Huyết áp, tiểu đường, tim mạch, khớp...)
                    </label>
                    <input
                      type="text"
                      name="medicalHistory"
                      value={formData.medicalHistory || ""}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: Tăng huyết áp, Đau dạ dày..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ghi chú sức khỏe khác
                    </label>
                    <textarea
                      name="medicalNotes"
                      rows={2}
                      value={formData.medicalNotes || ""}
                      onChange={handleInputChange}
                      placeholder="Ghi chú thêm về sức khỏe của cụ..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 3 */}
              <div className="space-y-4 pt-3 border-t border-slate-200">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100">
                  Phần 3: Thông Tin Chăm Sóc & Vận Động
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Khả năng di chuyển <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                          formData.mobilityStatus === "Bình thường"
                            ? "border-blue-500 bg-blue-50/40 text-blue-900"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mobilityStatus"
                          value="Bình thường"
                          checked={formData.mobilityStatus === "Bình thường"}
                          onChange={handleInputChange}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-bold block">Bình thường</span>
                          <span className="text-[11px] text-slate-500">
                            Cụ có thể tự đi lại, tự vận động trong sinh hoạt
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                          formData.mobilityStatus === "Cần hỗ trợ"
                            ? "border-amber-500 bg-amber-50/40 text-amber-900"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mobilityStatus"
                          value="Cần hỗ trợ"
                          checked={formData.mobilityStatus === "Cần hỗ trợ"}
                          onChange={handleInputChange}
                          className="mt-0.5"
                        />
                        <div>
                          <span className="font-bold block">Cần hỗ trợ</span>
                          <span className="text-[11px] text-slate-500">
                            Cần gậy chống, xe lăn hoặc người dìu đỡ
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Ghi chú chăm sóc
                    </label>
                    <textarea
                      name="careNotes"
                      rows={2}
                      value={formData.careNotes || ""}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: Cần nhắc nhở uống nước, chế độ ăn mềm..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                >
                  {isSubmitting
                    ? "Đang lưu..."
                    : isEditMode
                    ? "Cập Nhật Hồ Sơ"
                    : "Lưu Hồ Sơ Người Thân"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL XÁC NHẬN XÓA ================= */}
      {showDeleteConfirm && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Hồ Sơ</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa hồ sơ của cụ <span className="font-bold text-slate-900">{current.fullName}</span> không? Thao tác này sẽ ẩn hồ sơ người thân khỏi danh sách theo dõi của bạn.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
              >
                {isSubmitting ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElderlyProfileView;
