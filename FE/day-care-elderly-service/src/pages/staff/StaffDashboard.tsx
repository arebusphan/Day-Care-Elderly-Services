import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const StaffDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: "overview", label: "Tổng Quan Ca Trực" },
    { id: "assigned_elderly", label: "Danh Sách Người Cao Tuổi" },
    { id: "care_schedule", label: "Lịch Trực & Chăm Sóc" },
    { id: "health_monitoring", label: "Chỉ Số Sức Khỏe & Sinh Tồn" },
    { id: "medication", label: "Thuốc Men & Dinh Dưỡng" },
    { id: "shift_notes", label: "Nhật Ký & Bàn Giao Ca" },
    { id: "emergency", label: "Báo Cáo Sự Cố Khẩn" },
    { id: "settings", label: "Cài Đặt Cá Nhân" },
  ];

  const [activeTab, setActiveTab] = useState<string>("overview");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const activeItem = menuItems.find((item) => item.id === activeTab) || menuItems[0];

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-800 overflow-hidden">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between bg-white border-r border-slate-200">
        <div>
          {/* Header Sidebar */}
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Staff Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              {user?.fullName || user?.email || "Điều dưỡng / Nhân viên"}
            </p>
            <span className="inline-block mt-2 px-2 py-0.5 text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded">
              Vai trò: Điều Dưỡng
            </span>
          </div>

          {/* Danh sách các mục (Không dùng icon) */}
          <nav className="p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-teal-600 text-white font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Nút Về Trang Chủ và Đăng Xuất */}
        <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50">
          <Link
            to="/"
            className="block w-full text-center py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
          >
            Về Trang Chủ
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-center py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
          >
            Đăng Xuất
          </button>
        </div>
      </aside>

      {/* BÊN PHẢI: ĐỂ TRỐNG ĐỂ THIẾT KẾ NỘI DUNG SAU */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        {/* Topbar hiển thị tên mục hiện tại */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
          <h1 className="text-base font-bold text-slate-800">{activeItem.label}</h1>
        </header>

        {/* Vùng nội dung để trống */}
        <div className="flex-1 p-6">
          <div className="w-full h-full min-h-[300px] border-2 border-dashed border-slate-300 rounded-xl bg-white/50" />
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;
