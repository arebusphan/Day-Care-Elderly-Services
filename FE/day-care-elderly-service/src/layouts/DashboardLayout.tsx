import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Home,
  Menu,
  X,
  Bell,
  Calendar,
  ChevronRight,
  Shield,
  HeartPulse,
  Users,
} from "lucide-react";

export interface DashboardMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

interface DashboardLayoutProps {
  roleTitle: string;
  roleBadgeText: string;
  roleType: "admin" | "staff" | "family";
  menuItems: DashboardMenuItem[];
  initialActiveId?: string;
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  roleTitle,
  roleBadgeText,
  roleType,
  menuItems,
  initialActiveId,
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(
    initialActiveId || (menuItems.length > 0 ? menuItems[0].id : "")
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const activeItem = menuItems.find((item) => item.id === activeTab) || menuItems[0];

  // Theme color accents based on role
  const getRoleColors = () => {
    switch (roleType) {
      case "admin":
        return {
          brandBadge: "bg-rose-50 text-rose-700 border-rose-200",
          brandIcon: Shield,
          activeBg: "bg-rose-50 text-rose-700 font-semibold shadow-sm",
          activeIndicator: "bg-rose-600",
          avatarBg: "bg-rose-600 text-white",
        };
      case "staff":
        return {
          brandBadge: "bg-teal-50 text-teal-700 border-teal-200",
          brandIcon: HeartPulse,
          activeBg: "bg-teal-50 text-teal-700 font-semibold shadow-sm",
          activeIndicator: "bg-teal-600",
          avatarBg: "bg-teal-600 text-white",
        };
      default:
        return {
          brandBadge: "bg-blue-50 text-blue-700 border-blue-200",
          brandIcon: Users,
          activeBg: "bg-blue-50 text-blue-700 font-semibold shadow-sm",
          activeIndicator: "bg-blue-600",
          avatarBg: "bg-blue-600 text-white",
        };
    }
  };

  const colors = getRoleColors();
  const RoleIcon = colors.brandIcon;

  // Lấy 2 ký tự đầu tên hoặc email để làm avatar
  const getInitials = () => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return user.fullName.slice(0, 2).toUpperCase();
    }
    return user?.email?.slice(0, 2).toUpperCase() || "DC";
  };

  // Format ngày hôm nay
  const formattedToday = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ===================== SIDEBAR (BÊN TRÁI) ===================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between border-r border-slate-200/90 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Role Header */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-md shadow-blue-500/20">
                ☀️
              </span>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 leading-none block">
                  DayCare
                </span>
                <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                  Elderly Service
                </span>
              </div>
            </Link>

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile Card Mini */}
          <div className="mx-4 mt-3 mb-2 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 p-3.5 border border-slate-200/60">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-sm ${colors.avatarBg}`}
              >
                {getInitials()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">
                  {user?.fullName || user?.email || "Người dùng"}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {user?.email || "Chưa cập nhật email"}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
              <span className="text-slate-500 font-medium">Vai trò:</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${colors.brandBadge}`}
              >
                <RoleIcon className="h-3 w-3" />
                {roleBadgeText}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Menu Items Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Danh Mục Quản Trị
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition-all ${
                  isActive
                    ? `${colors.activeBg}`
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {isActive && (
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-md ${colors.activeIndicator}`}
                  />
                )}
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    isActive
                      ? "text-inherit"
                      : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                <span className="truncate flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Actions: Về trang chủ & Đăng xuất */}
        <div className="border-t border-slate-200/80 p-3 space-y-1 bg-white">
          <Link
            to="/"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>Về Trang Chủ</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ===================== BÊN PHẢI (MAIN CONTENT) ===================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-5 backdrop-blur-md">
          {/* Left: Mobile hamburger & Active Tab title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{roleTitle}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-semibold text-slate-700">
                  {activeItem?.label || "Tổng quan"}
                </span>
              </div>
              <h1 className="text-base font-bold text-slate-800 capitalize leading-tight">
                {activeItem?.label || "Tổng quan"}
              </h1>
            </div>
          </div>

          {/* Right: Date, Notifications */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/70 rounded-lg px-3 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize">{formattedToday}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 h-9 w-9 p-0"
              title="Thông báo"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content Area: Bên phải để trống */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children ? (
            children
          ) : (
            <div className="flex h-full min-h-[450px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 shadow-inner">
                {activeItem?.icon ? (
                  <activeItem.icon className="h-7 w-7 text-slate-400" />
                ) : (
                  <RoleIcon className="h-7 w-7 text-slate-400" />
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-700">
                {activeItem?.label}
              </h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                Khu vực nội dung đang để trống. Sẵn sàng tích hợp dữ liệu và tính năng cho mục này.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
