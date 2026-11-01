import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CalendarCheck, CalendarDays, Users2, UserCheck, LogOut, Home, History } from "lucide-react";
import ShiftCalendarView from "./ShiftCalendarView";
import CenterStaffView from "./CenterStaffView";
import DailyPlanningWizard from "./DailyPlanningWizard";
import CenterElderlyView from "./CenterElderlyView";
import CenterPlanHistoryView from "./CenterPlanHistoryView";

export const CenterDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "daily-planning",
      label: "Lập Kế Hoạch Ngày Mai",
      subLabel: "5 Bước Tự Động Phân Công",
      icon: CalendarCheck,
    },
    {
      id: "shift-assignment",
      label: "Lịch Phân Ca & Nhóm Chăm Sóc",
      subLabel: "Xem và điều chỉnh nhóm",
      icon: CalendarDays,
    },
    {
      id: "plan-history",
      label: "Lịch Sử Kế Hoạch & Phân Công",
      subLabel: "Kiểm tra nhật ký các ngày",
      icon: History,
    },
    {
      id: "staff-list",
      label: "Quản Lý Nhân Viên",
      subLabel: "Danh sách, tạo mới & ngày nghỉ",
      icon: UserCheck,
    },
    {
      id: "elderly-list",
      label: "Danh Sách Người Cao Tuổi",
      subLabel: "Hồ sơ sức khỏe & phân loại",
      icon: Users2,
    },
  ];

  const [activeTab, setActiveTab] = useState<string>("daily-planning");
  const [calendarTargetDate, setCalendarTargetDate] = useState<string | undefined>(undefined);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewDateInCalendar = (date: string) => {
    setCalendarTargetDate(date);
    setActiveTab("shift-assignment");
  };

  const activeItem = menuItems.find((item) => item.id === activeTab) || menuItems[0];

  return (
    <div className="flex h-screen w-full bg-slate-100 text-slate-800 overflow-hidden">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between bg-white border-r border-slate-200">
        <div>
          {/* Header Sidebar */}
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Center Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {user?.fullName || user?.email || "Quản lý trung tâm"}
            </p>
            <span className="inline-block mt-2 px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              Vai trò: Quản lý Trung Tâm
            </span>
          </div>

          {/* Danh sách các mục */}
          <nav className="p-3 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition flex items-start gap-3 ${
                    isActive
                      ? "bg-emerald-600 text-white font-semibold shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon size={18} className={`mt-0.5 shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <div>
                    <p className={`text-xs font-bold leading-snug ${isActive ? "text-white" : "text-slate-800"}`}>
                      {item.label}
                    </p>
                    <p className={`text-[10px] leading-tight mt-0.5 ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                      {item.subLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Nút Về Trang Chủ và Đăng Xuất */}
        <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50">
          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition shadow-xs"
          >
            <Home size={14} />
            <span>Về Trang Chủ</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition shadow-xs"
          >
            <LogOut size={14} />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </aside>

      {/* BÊN PHẢI: NỘI DUNG */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        {/* Topbar hiển thị tên mục hiện tại */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <activeItem.icon size={18} className="text-emerald-600" />
            <h1 className="text-base font-bold text-slate-800">{activeItem.label}</h1>
            <span className="text-xs text-slate-400 font-normal ml-2 hidden sm:inline">
              • {activeItem.subLabel}
            </span>
          </div>
        </header>

        {/* Vùng nội dung */}
        <div className="flex-1 p-6">
          {activeTab === "daily-planning" ? (
            <DailyPlanningWizard />
          ) : activeTab === "shift-assignment" ? (
            <ShiftCalendarView
              initialDate={calendarTargetDate}
              onGoToPlanning={() => setActiveTab("daily-planning")}
            />
          ) : activeTab === "plan-history" ? (
            <CenterPlanHistoryView onViewPlanDate={handleViewDateInCalendar} />
          ) : activeTab === "staff-list" ? (
            <CenterStaffView />
          ) : activeTab === "elderly-list" ? (
            <CenterElderlyView />
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default CenterDashboard;
