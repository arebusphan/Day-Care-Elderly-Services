import React, { useState, useEffect, useCallback } from "react";
import adminUserService from "../../services/adminUserService";
import type {
  UserDetail,
  UserFilter,
  CreateUserDto,
  UpdateUserDto,
  PagedResult,
} from "../../services/adminUserService";

// ── Helpers ───────────────────────────────────────────

const roleBadgeColors: Record<string, string> = {
  Admin: "bg-rose-100 text-rose-700 border-rose-200",
  Staff: "bg-sky-100 text-sky-700 border-sky-200",
  FamilyMember: "bg-amber-100 text-amber-700 border-amber-200",
};

const getRoleBadge = (role: string) =>
  roleBadgeColors[role] ?? "bg-slate-100 text-slate-600 border-slate-200";

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ── Component ─────────────────────────────────────────

const UserManagementView: React.FC = () => {
  // ── State ───────────────────────────────────
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [paged, setPaged] = useState<PagedResult<UserDetail> | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    isActive: boolean;
    newPassword: string;
    roles: string[];
  }>({
    email: "",
    password: "",
    fullName: "",
    phoneNumber: "",
    isActive: true,
    newPassword: "",
    roles: [],
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserDetail | null>(null);

  // ── Fetch ───────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: UserFilter = {
        search: search || undefined,
        roleName: filterRole || undefined,
        isActive: filterActive === "" ? undefined : filterActive === "true",
        pageNumber: page,
        pageSize,
      };
      const res = await adminUserService.getUsers(filter);
      if (res.success && res.data) {
        setUsers(res.data.items);
        setPaged(res.data);
      } else {
        setError(res.message || "Không thể tải danh sách người dùng.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterActive, page]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await adminUserService.getRoles();
      if (res.success && res.data) {
        setRoles(res.data);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // ── Modal Handlers ──────────────────────────
  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      password: "",
      fullName: "",
      phoneNumber: "",
      isActive: true,
      newPassword: "",
      roles: [],
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const openEditModal = (user: UserDetail) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: "",
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || "",
      isActive: user.isActive,
      newPassword: "",
      roles: [...user.roles],
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormErrors([]);
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update
        const dto: UpdateUserDto = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber || undefined,
          isActive: formData.isActive,
          newPassword: formData.newPassword || undefined,
          roles: formData.roles,
        };
        const res = await adminUserService.updateUser(editingUser.userId, dto);
        if (res.success) {
          setSuccessMsg("Cập nhật người dùng thành công!");
          closeModal();
          fetchUsers();
        } else {
          setFormErrors(res.errors || [res.message]);
        }
      } else {
        // Create
        const dto: CreateUserDto = {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber || undefined,
          isActive: formData.isActive,
          roles: formData.roles,
        };
        const res = await adminUserService.createUser(dto);
        if (res.success) {
          setSuccessMsg("Tạo người dùng mới thành công!");
          closeModal();
          fetchUsers();
        } else {
          setFormErrors(res.errors || [res.message]);
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.errors ||
        err?.response?.data?.message ||
        "Có lỗi xảy ra.";
      setFormErrors(Array.isArray(msg) ? msg : [msg]);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Status ───────────────────────────
  const handleToggleStatus = async (user: UserDetail) => {
    try {
      const res = await adminUserService.toggleStatus(user.userId);
      if (res.success) {
        setSuccessMsg(res.message || "Đã cập nhật trạng thái.");
        fetchUsers();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi cập nhật trạng thái.");
    }
  };

  // ── Delete ──────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminUserService.deleteUser(deleteTarget.userId);
      if (res.success) {
        setSuccessMsg("Đã xóa người dùng thành công.");
        setDeleteTarget(null);
        fetchUsers();
      } else {
        setError(res.message);
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Lỗi xóa người dùng.");
      setDeleteTarget(null);
    }
  };

  // ── Render ──────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Success Toast */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-fade-in">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Toolbar: Search + Filters + Create Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
            />
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã khóa</option>
          </select>

          {/* Create Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Người Dùng
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Họ và Tên</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">SĐT</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Vai Trò</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Trạng Thái</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Ngày Tạo</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Không tìm thấy người dùng nào.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {user.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {user.phoneNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getRoleBadge(role)}`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        title={user.isActive ? "Nhấn để khóa" : "Nhấn để kích hoạt"}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full transition cursor-pointer ${
                          user.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {user.isActive ? "Hoạt động" : "Đã khóa"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paged && paged.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Hiển thị {users.length} / {paged.totalItems} người dùng &middot; Trang {paged.pageNumber} / {paged.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!paged.hasPreviousPage}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Trước
              </button>

              {/* Page numbers */}
              {Array.from({ length: paged.totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === paged.totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-slate-400 text-xs">…</span>
                    )}
                    <button
                      onClick={() => setPage(p)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition ${
                        p === page
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                disabled={!paged.hasNextPage}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingUser ? "Chỉnh Sửa Người Dùng" : "Thêm Người Dùng Mới"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Errors */}
            {formErrors.length > 0 && (
              <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
                <ul className="list-disc list-inside text-sm text-rose-700 space-y-1">
                  {formErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Email (only for create) */}
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    placeholder="user@example.com"
                  />
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {editingUser ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
                  {!editingUser && <span className="text-rose-500"> *</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={editingUser ? formData.newPassword : formData.password}
                  onChange={(e) =>
                    editingUser
                      ? setFormData({ ...formData, newPassword: e.target.value })
                      : setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder={editingUser ? "Nhập mật khẩu mới..." : "Tối thiểu 6 ký tự"}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Họ và Tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  placeholder="0901234567"
                />
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vai Trò</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const selected = formData.roles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(role)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {selected && (
                          <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Trạng Thái:</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative w-11 h-6 rounded-full transition ${
                    formData.isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-xs font-medium ${formData.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                  {formData.isActive ? "Hoạt động" : "Đã khóa"}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  {submitting ? "Đang xử lý..." : editingUser ? "Cập Nhật" : "Tạo Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Xóa Người Dùng</h3>
              <p className="text-sm text-slate-500 mb-5">
                Bạn có chắc chắn muốn xóa <strong className="text-slate-700">{deleteTarget.fullName}</strong>?
                <br />Hành động này không thể hoàn tác.
              </p>
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition shadow-sm"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
