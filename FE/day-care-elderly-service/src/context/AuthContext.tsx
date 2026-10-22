import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import type { LoginRequestDto, RegisterRequestDto, UserDto } from "../types/auth";

export type AuthModalMode = "login" | "register";

interface AuthContextType {
  user: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  login: (payload: LoginRequestDto) => Promise<UserDto>;
  register: (payload: RegisterRequestDto) => Promise<UserDto>;
  logout: () => void;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  switchAuthModalMode: (mode: AuthModalMode) => void;
  getDashboardUrl: (userToCheck?: UserDto | null) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getRoleDashboardPath(targetUser?: UserDto | null): string {
  if (!targetUser || !targetUser.roles || targetUser.roles.length === 0) {
    return "/dashboard/family";
  }

  // Normalize case-insensitive check
  const roles = targetUser.roles.map((r) => r.toLowerCase());

  if (roles.includes("admin")) {
    return "/dashboard/admin";
  }
  if (roles.includes("staff")) {
    return "/dashboard/staff";
  }
  return "/dashboard/family";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<UserDto | null>(() => {
    const saved = localStorage.getItem("auth_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");

  // Verify session on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("auth_token");
      if (storedToken) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem("auth_user", JSON.stringify(res.data));
          }
        } catch (err) {
          console.warn("Session check failed, clearing token", err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();

    const handleExternalLogout = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("auth:logout", handleExternalLogout);
    return () => window.removeEventListener("auth:logout", handleExternalLogout);
  }, []);

  const openAuthModal = (mode: AuthModalMode = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const switchAuthModalMode = (mode: AuthModalMode) => {
    setAuthModalMode(mode);
  };

  const login = async (payload: LoginRequestDto): Promise<UserDto> => {
    const res = await authService.login(payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    }

    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem("auth_token", receivedToken);
    localStorage.setItem("auth_user", JSON.stringify(receivedUser));
    closeAuthModal();

    return receivedUser;
  };

  const register = async (payload: RegisterRequestDto): Promise<UserDto> => {
    const res = await authService.register(payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    }

    const { token: receivedToken, user: receivedUser } = res.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem("auth_token", receivedToken);
    localStorage.setItem("auth_user", JSON.stringify(receivedUser));
    closeAuthModal();

    return receivedUser;
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        switchAuthModalMode,
        getDashboardUrl: (target) => getRoleDashboardPath(target !== undefined ? target : user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
