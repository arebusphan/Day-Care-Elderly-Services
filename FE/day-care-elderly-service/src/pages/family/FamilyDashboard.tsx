import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ElderlyProfileView from "./ElderlyProfileView";
import { ServicePackagesView } from "./ServicePackagesView";
import { BillingView } from "./BillingView";

export const FamilyDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: "my_elderly", label: "Hồ Sơ Người Thân" },
    { id: "overview", label: "Tổng Quan Hoạt Động" },
    { id: "daily_schedule", label: "Lịch Trình Hằng Ngày" },
    { id: "health_tracking", label: "Theo Dõi Sức Khỏe" },
    { id: "diet_meals", label: "Dinh Dưỡng & Khẩu Phần" },
    { id: "services", label: "Gói Dịch Vụ Đã Đăng Ký" },
    { id: "billing", label: "Hóa Đơn & Chi Phí" },
    { id: "feedback", label: "Ý Kiến & Hỗ Trợ" },
    { id: "settings", label: "Cài Đặt Tài Khoản" },
  ];

  // Mặc định chọn mục "Hồ Sơ Người Thân" để bạn test ngay
  const [activeTab, setActiveTab] = useState<string>("my_elderly");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const activeItem = menuItems.find((item) => item.id === activeTab) || menuItems[0];

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-800 overflow-hidden font-sans">
      {/* SIDEBAR BÊN TRÁI (TEXT-ONLY, KHÔNG DÙNG ICON) */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between bg-white border-r border-slate-200">
        <div>
          {/* Header Sidebar */}
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Family Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              {user?.fullName || user?.email || "Người thân"}
            </p>
            <span className="inline-block mt-2 px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
              Vai trò: Người Thân
            </span>
          </div>

          {/* Danh sách các mục */}
          <nav className="p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-sm"
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

      {/* BÊN PHẢI: HIỂN THỊ NỘI DUNG MỤC ĐƯỢC CHỌN */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
          <h1 className="text-base font-bold text-slate-800">{activeItem.label}</h1>
        </header>

        {/* Khu vực nội dung */}
        <div className="flex-1 p-6">
          {activeTab === "my_elderly" ? (
            <ElderlyProfileView onNavigateToServices={() => setActiveTab("services")} />
          ) : activeTab === "services" ? (
            <ServicePackagesView
              onBackToProfile={() => setActiveTab("my_elderly")}
              onNavigateToBilling={() => setActiveTab("billing")}
            />
          ) : activeTab === "billing" ? (
            <BillingView onNavigateToServices={() => setActiveTab("services")} />
          ) : (
            <div className="w-full h-full min-h-[350px] border-2 border-dashed border-slate-300 rounded-xl bg-white/50 flex flex-col items-center justify-center text-center p-6">
              <p className="text-sm font-semibold text-slate-600">Khu vực {activeItem.label}</p>
              <p className="text-xs text-slate-400 mt-1">Đang để trống sẵn sàng để thiết kế nội dung sau.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FamilyDashboard;
