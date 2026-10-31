import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import centerStaffService from "../../services/centerStaffService";
import type {
  CenterStaff,
  CenterStaffFilter,
  CreateCenterStaffDto,
  DeactivationWarning,
  StaffLeave,
  PagedResult,
} from "../../services/centerStaffService";

export const CenterStaffView: React.FC = () => {
  const { user: currentUser } = useAuth();

  // ── Staff List State ──────────────────────────────────────
  const [staffList, setStaffList] = useState<CenterStaff[]>([]);
  const [paged, setPaged] = useState<PagedResult<CenterStaff> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>(""); // "" = All, "true" = Active, "false" = Inactive
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // ── Add Staff Modal State ─────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState<CreateCenterStaffDto>({
    fullName: "",
    email: "",
    phoneNumber: "",
    temporaryPassword: "Staff@" + Math.floor(100000 + Math.random() * 900000),
  });
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // ── Toggle Status / Deactivation Modal State ──────────────
  const [statusTarget, setStatusTarget] = useState<CenterStaff | null>(null);
  const [deactWarning, setDeactWarning] = useState<DeactivationWarning | null>(null);
  const [checkingWarning, setCheckingWarning] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  // ── Staff Leaves Modal State ──────────────────────────────
  const [leaveTarget, setLeaveTarget] = useState<CenterStaff | null>(null);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [newLeaveDate, setNewLeaveDate] = useState("");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState<string | null>(null);

  // Helper date formatted today YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Fetch Staff List ──────────────────────────────────────
  const fetchStaffList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: CenterStaffFilter = {
        search: search.trim() || undefined,
        isActive: filterActive === "" ? undefined : filterActive === "true",
        pageNumber: page,
        pageSize,
      };
      const res = await centerStaffService.getStaffList(filter);
      if (res.success && res.data) {
        setStaffList(res.data.items);
        setPaged(res.data);
      } else {
        setError(res.message || "Không thể tải danh sách nhân viên.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi kết nối máy chủ khi tải danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, page]);

  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // ── Auto hide success message ─────────────────────────────
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ── Handle Add Staff ──────────────────────────────────────
  const handleOpenAddModal = () => {
    setAddFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      temporaryPassword: "Staff@" + Math.floor(100000 + Math.random() * 900000),
    });
    setAddErrors([]);
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrors([]);

    const errs: string[] = [];
    if (!addFormData.fullName.trim()) errs.push("Họ và tên là bắt buộc.");
    if (!addFormData.email.trim()) errs.push("Email là bắt buộc.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addFormData.email)) {
      errs.push("Email không hợp lệ.");
    }
    if (!addFormData.temporaryPassword || addFormData.temporaryPassword.length < 6) {
      errs.push("Mật khẩu tạm phải có ít nhất 6 ký tự.");
    }

    if (errs.length > 0) {
      setAddErrors(errs);
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await centerStaffService.createStaff(addFormData);
      if (res.success) {
        setSuccessMsg(res.message || "Thêm nhân viên mới thành công.");
        setShowAddModal(false);
        fetchStaffList();
      } else {
        setAddErrors([res.message || "Không thể thêm nhân viên."]);
      }
    } catch (err: any) {
      const resp = err?.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        setAddErrors(resp.errors);
      } else {
        setAddErrors([resp?.message || "Lỗi kết nối máy chủ khi tạo nhân viên."]);
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  // ── Handle Toggle Status Confirmation ─────────────────────
  const handleInitiateToggleStatus = async (staff: CenterStaff) => {
    if (currentUser?.userId && currentUser.userId.toLowerCase() === staff.userId.toLowerCase()) {
      alert("Bạn không thể tự ngừng hoạt động tài khoản của chính mình.");
      return;
    }

    setStatusTarget(staff);
    setDeactWarning(null);

    // If currently active, manager wants to deactivate -> check upcoming leaves/shifts
    if (staff.isActive) {
      setCheckingWarning(true);
      try {
        const res = await centerStaffService.checkDeactivation(staff.userId);
        if (res.success && res.data) {
          setDeactWarning(res.data);
        }
      } catch (err) {
        console.error("Lỗi kiểm tra lịch khi ngừng hoạt động:", err);
      } finally {
        setCheckingWarning(false);
      }
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTarget) return;

    setTogglingStatus(true);
    try {
      const res = await centerStaffService.toggleStatus(statusTarget.userId);
      if (res.success) {
        setSuccessMsg(res.message || "Đã cập nhật trạng thái nhân viên.");
        setStatusTarget(null);
        fetchStaffList();
      } else {
        alert(res.message || "Không thể cập nhật trạng thái nhân viên.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi cập nhật trạng thái nhân viên.");
    } finally {
      setTogglingStatus(false);
    }
  };

  // ── Handle Staff Leaves Modal ─────────────────────────────
  const handleOpenLeavesModal = async (staff: CenterStaff) => {
    setLeaveTarget(staff);
    setLeaves([]);
    setNewLeaveDate("");
    setNewLeaveReason("");
    setLeaveError(null);
    setLoadingLeaves(true);

    try {
      const res = await centerStaffService.getLeaves(staff.userId);
      if (res.success && res.data) {
        setLeaves(res.data);
      } else {
        setLeaveError(res.message || "Không thể tải danh sách ngày nghỉ.");
      }
    } catch (err: any) {
      setLeaveError(err?.response?.data?.message || "Lỗi kết nối máy chủ khi tải ngày nghỉ.");
    } finally {
      setLoadingLeaves(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);

    if (!leaveTarget) return;
    if (!newLeaveDate) {
      setLeaveError("Vui lòng chọn ngày nghỉ.");
      return;
    }

    // Check past date
    if (newLeaveDate < todayStr) {
      setLeaveError("Không thể đặt ngày nghỉ cho ngày đã qua.");
      return;
    }

    // Check Sunday
    const chosenDate = new Date(newLeaveDate + "T00:00:00");
    if (chosenDate.getDay() === 0) {
      setLeaveError("Không thể đặt ngày nghỉ vào Chủ nhật (trung tâm nghỉ cố định).");
      return;
    }

    setSubmittingLeave(true);
    try {
      const res = await centerStaffService.addLeave(leaveTarget.userId, {
        leaveDate: newLeaveDate,
        reason: newLeaveReason.trim() || undefined,
      });

      if (res.success && res.data) {
        setLeaves((prev) => [res.data!, ...prev].sort((a, b) => b.leaveDate.localeCompare(a.leaveDate)));
        setNewLeaveDate("");
        setNewLeaveReason("");
        setSuccessMsg("Đã thêm ngày nghỉ cho nhân viên thành công.");
        fetchStaffList(); // refresh today status if applicable
      } else {
        setLeaveError(res.message || "Không thể thêm ngày nghỉ.");
      }
    } catch (err: any) {
      setLeaveError(err?.response?.data?.message || "Lỗi khi lưu ngày nghỉ.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!leaveTarget) return;
    if (!confirm("Bạn có chắc chắn muốn xóa ngày nghỉ này?")) return;

    setDeletingLeaveId(leaveId);
    try {
      const res = await centerStaffService.deleteLeave(leaveTarget.userId, leaveId);
      if (res.success) {
        setLeaves((prev) => prev.filter((l) => l.leaveId !== leaveId));
        setSuccessMsg("Đã xóa ngày nghỉ.");
        fetchStaffList();
      } else {
        alert(res.message || "Không thể xóa ngày nghỉ.");
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Lỗi khi xóa ngày nghỉ.");
    } finally {
      setDeletingLeaveId(null);
    }
  };

  const formatDateVN = (dStr: string) => {
    try {
      const d = new Date(dStr + "T00:00:00");
      const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[d.getDay()];
      const dateFormatted = d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      return `${dayName}, ${dateFormatted}`;
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER BARS ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Quản Lý Nhân Viên (Staff)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách nhân viên chăm sóc, theo dõi ngày làm việc & ngày nghỉ trong trung tâm.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm Nhân Viên Mới
        </button>
      </div>

      {/* ── NOTIFICATION BANNERS ──────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* ── FILTERS & SEARCH ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo họ tên hoặc email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái:</span>
          <select
            value={filterActive}
            onChange={(e) => {
              setFilterActive(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 font-medium"
          >
            <option value="">Tất cả (Đang & Ngừng HĐ)</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* ── DATA TABLE ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nhân Viên</th>
                <th className="py-3.5 px-4">Số Điện Thoại</th>
                <th className="py-3.5 px-4">Ngày Tạo</th>
                <th className="py-3.5 px-4">Hôm Nay</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Đang tải danh sách nhân viên...</span>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.userId} className="hover:bg-slate-50/80 transition">
                    {/* Họ tên & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{staff.fullName}</div>
                      <div className="text-xs text-slate-500">{staff.email}</div>
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {staff.phoneNumber || <span className="text-slate-400 italic">Chưa cập nhật</span>}
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(staff.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>

                    {/* Cột "Hôm Nay": Đi làm hoặc Nghỉ */}
                    <td className="py-3.5 px-4">
                      {staff.todayStatus === "Đi làm" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Đi làm
                        </span>
                      ) : (
                        <div className="inline-flex flex-col">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Nghỉ
                          </span>
                          {staff.todayReason && (
                            <span className="text-[11px] text-amber-600 mt-0.5 ml-1 italic" title={staff.todayReason}>
                              {staff.todayReason.length > 25 ? staff.todayReason.substring(0, 25) + "..." : staff.todayReason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Trạng thái hoạt động */}
                    <td className="py-3.5 px-4">
                      {staff.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Ngừng hoạt động
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Nút Ngày nghỉ */}
                        <button
                          onClick={() => handleOpenLeavesModal(staff)}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                          title="Quản lý lịch nghỉ phép của nhân viên"
                        >
                          📅 Ngày nghỉ
                        </button>

                        {/* Nút Bật / Tắt hoạt động */}
                        <button
                          onClick={() => handleInitiateToggleStatus(staff)}
                          disabled={currentUser?.userId?.toLowerCase() === staff.userId.toLowerCase()}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                            staff.isActive
                              ? "text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                          } ${
                            currentUser?.userId?.toLowerCase() === staff.userId.toLowerCase()
                              ? "opacity-40 cursor-not-allowed"
                              : ""
                          }`}
                          title={
                            currentUser?.userId?.toLowerCase() === staff.userId.toLowerCase()
                              ? "Bạn không thể tự ngừng hoạt động chính mình"
                              : staff.isActive
                              ? "Ngừng hoạt động nhân viên"
                              : "Kích hoạt lại nhân viên"
                          }
                        >
                          {staff.isActive ? "Ngừng HĐ" : "Kích hoạt"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ──────────────────────────────────────── */}
        {paged && paged.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
            <div>
              Trang <span className="font-semibold text-slate-900">{paged.pageNumber}</span> /{" "}
              <span className="font-semibold text-slate-900">{paged.totalPages}</span> (Tổng cộng {paged.totalItems} nhân viên)
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={paged.pageNumber <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-300 rounded bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Trước
              </button>
              {Array.from({ length: paged.totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`px-3 py-1.5 border rounded font-medium transition ${
                    num === paged.pageNumber
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                disabled={paged.pageNumber >= paged.totalPages}
                onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-300 rounded bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: THÊM NHÂN VIÊN MỚI ──────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </span>
                Thêm Nhân Viên Mới
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addErrors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 space-y-1">
                  {addErrors.map((err, idx) => (
                    <div key={idx}>• {err}</div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={addFormData.fullName}
                  onChange={(e) => setAddFormData({ ...addFormData, fullName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Không được trùng) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@daycare.com"
                  value={addFormData.email}
                  onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={addFormData.phoneNumber || ""}
                  onChange={(e) => setAddFormData({ ...addFormData, phoneNumber: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu tạm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addFormData.temporaryPassword}
                  onChange={(e) => setAddFormData({ ...addFormData, temporaryPassword: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Nhân viên có thể dùng mật khẩu này để đăng nhập lần đầu và đổi mật khẩu sau.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingAdd && (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  Tạo Nhân Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN BẬT / TẮT HOẠT ĐỘNG ───────────────── */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className={`px-6 py-4 border-b ${statusTarget.isActive ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"} flex items-center justify-between`}>
              <h3 className={`text-base font-bold ${statusTarget.isActive ? "text-rose-800" : "text-emerald-800"}`}>
                {statusTarget.isActive ? "Xác nhận Ngừng Hoạt Động" : "Kích Hoạt Lại Nhân Viên"}
              </h3>
              <button
                onClick={() => setStatusTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Bạn có chắc chắn muốn {statusTarget.isActive ? "ngừng hoạt động" : "kích hoạt lại"} nhân viên{" "}
                <span className="font-bold text-slate-900">{statusTarget.fullName}</span> ({statusTarget.email})?
              </p>

              {statusTarget.isActive && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">Lưu ý quan trọng:</p>
                    <p>• Nhân viên ngừng hoạt động sẽ <strong>không thể đăng nhập</strong> vào hệ thống.</p>
                    <p>• Không xuất hiện trong danh sách lựa chọn khi phân chia ca làm việc.</p>
                    <p>• Dữ liệu cũ (nhật ký, chăm sóc, sự cố, điểm danh...) vẫn được lưu trữ nguyên vẹn.</p>
                  </div>

                  {checkingWarning ? (
                    <div className="text-xs text-slate-400 italic flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Đang kiểm tra lịch tương lai của nhân viên...
                    </div>
                  ) : deactWarning && deactWarning.hasFutureSchedules ? (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-800 space-y-1 animate-pulse">
                      <p className="font-bold flex items-center gap-1.5">
                        ⚠️ CẢNH BÁO LỊCH TRÌNH TƯƠNG LAI:
                      </p>
                      <p>{deactWarning.message}</p>
                      <p className="text-[11px] text-rose-600">
                        Vui lòng lưu ý sắp xếp lại ca trực hoặc cập nhật ngày nghỉ trước khi ngừng hoạt động.
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStatusTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggleStatus}
                  disabled={togglingStatus}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition flex items-center gap-1.5 ${
                    statusTarget.isActive
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {togglingStatus && (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {statusTarget.isActive ? "Xác Nhận Ngừng HĐ" : "Xác Nhận Kích Hoạt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: QUẢN LÝ NGÀY NGHỈ (STAFF LEAVES) ───────────── */}
      {leaveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1 bg-amber-100 text-amber-700 rounded-md">📅</span>
                  Quản Lý Ngày Nghỉ: {leaveTarget.fullName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{leaveTarget.email}</p>
              </div>
              <button
                onClick={() => setLeaveTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Form Thêm Ngày Nghỉ */}
              <form onSubmit={handleAddLeave} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  + Thêm Ngày Nghỉ Mới
                </h4>

                {leaveError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {leaveError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chọn ngày nghỉ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      required
                      value={newLeaveDate}
                      onChange={(e) => {
                        setNewLeaveDate(e.target.value);
                        setLeaveError(null);
                      }}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Chỉ chọn từ hôm nay trở đi (trừ Chủ nhật).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do nghỉ</label>
                    <input
                      type="text"
                      placeholder="Nghỉ phép cá nhân, ốm, việc gia đình..."
                      value={newLeaveReason}
                      onChange={(e) => setNewLeaveReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={submittingLeave}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingLeave && (
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    Lưu Ngày Nghỉ
                  </button>
                </div>
              </form>

              {/* Danh sách các ngày nghỉ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Danh Sách Ngày Nghỉ Đã Đặt ({leaves.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Dữ liệu dùng để tự động loại trừ khi xếp ca làm việc
                  </span>
                </div>

                {loadingLeaves ? (
                  <div className="py-8 text-center text-xs text-slate-400">Đang tải ngày nghỉ...</div>
                ) : leaves.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    Nhân viên này hiện chưa có ngày nghỉ nào được ghi nhận.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {leaves.map((leave) => {
                      const isPast = leave.leaveDate < todayStr;
                      return (
                        <div
                          key={leave.leaveId}
                          className={`p-3.5 flex items-center justify-between text-xs transition ${
                            isPast ? "bg-slate-50/50 opacity-60" : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {formatDateVN(leave.leaveDate)}
                              </span>
                              {isPast ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                                  Đã qua
                                </span>
                              ) : leave.leaveDate === todayStr ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  Hôm nay
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  Sắp tới
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500">
                              Lý do: <span className="text-slate-700 font-medium">{leave.reason || "Không ghi chú"}</span>
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteLeave(leave.leaveId)}
                            disabled={deletingLeaveId === leave.leaveId}
                            className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition disabled:opacity-40"
                            title="Xóa ngày nghỉ này"
                          >
                            {deletingLeaveId === leave.leaveId ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setLeaveTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CenterStaffView;
