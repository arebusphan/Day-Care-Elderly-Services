import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, openAuthModal } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-600">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Open auth modal and redirect to home
    setTimeout(() => openAuthModal("login"), 100);
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const userRolesLower = userRoles.map((r) => r.toLowerCase());
    const hasRole = allowedRoles.some((role) =>
      userRolesLower.includes(role.toLowerCase())
    );

    if (!hasRole) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
          <div className="rounded-2xl bg-white p-8 shadow-xl max-w-md w-full border border-slate-100">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Không Có Quyền Truy Cập</h2>
            <p className="text-sm text-slate-500 mb-6">
              Tài khoản của bạn ({user.email}) với vai trò [{userRoles.join(", ") || "Chưa có"}] không thể vào trang này.
            </p>
            <a
              href="/"
              className="inline-flex w-full justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
            >
              Quay Về Trang Chủ
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
