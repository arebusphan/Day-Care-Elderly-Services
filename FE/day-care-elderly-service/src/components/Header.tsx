import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, LayoutDashboard, Shield, HeartPulse, Users } from "lucide-react";

export default function Header() {
  const { user, isAuthenticated, openAuthModal, logout, getDashboardUrl } = useAuth();

  const getRoleBadge = () => {
    if (!user || !user.roles || user.roles.length === 0) return null;
    const role = user.roles[0];
    if (role.toLowerCase() === "admin") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          <Shield className="h-3 w-3" />
          Admin
        </span>
      );
    }
    if (role.toLowerCase() === "staff") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
          <HeartPulse className="h-3 w-3" />
          Điều Dưỡng
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
        <Users className="h-3 w-3" />
        Người Thân
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-black text-blue-600 tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            ☀️
          </span>
          <span>DayCare</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-semibold text-slate-700 transition hover:text-blue-600"
          >
            Trang Chủ
          </Link>
          <a
            href="#about"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Về Chúng Tôi
          </a>
          <a
            href="#services"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Dịch Vụ
          </a>
          <a
            href="#blog"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Cẩm Nang
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-slate-600 transition hover:text-blue-600"
          >
            Liên Hệ
          </a>
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {user.fullName || user.email}
                  </span>
                  <div>{getRoleBadge()}</div>
                </div>
              </div>

              {/* Dashboard Button */}
              <Link to={getDashboardUrl()}>
                <Button
                  size="sm"
                  className="rounded-xl flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 font-semibold text-xs px-3.5 h-9"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Vào Dashboard</span>
                </Button>
              </Link>

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 h-9 px-2.5"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openAuthModal("register")}
                className="hidden sm:inline-flex text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl h-9 px-3"
              >
                Đăng ký
              </Button>
              <Button
                size="sm"
                onClick={() => openAuthModal("login")}
                className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 h-9 text-xs"
              >
                Đăng Nhập
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}