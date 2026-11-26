import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setToken, setUnauthorizedHandler, tokenRestored } from "./api";
import { authApi } from "./services";
import { storage } from "./storage";
import type { User } from "./types";

const TOKEN_KEY = "daycare_token";
const USER_KEY = "daycare_user";

/** Vai trò dùng trên mobile: Staff và FamilyMember. Các vai trò khác dùng web. */
export type MobileRole = "staff" | "family" | "other";
export const roleOf = (user: User | null): MobileRole =>
  !user ? "other" : user.roles.includes("Staff") ? "staff" : user.roles.includes("FamilyMember") ? "family" : "other";

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as User);
        }
      } catch {
        // dữ liệu lưu hỏng thì coi như chưa đăng nhập
      } finally {
        tokenRestored();
        setReady(true);
      }
    })();
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email.trim(), password);
    setToken(result.token);
    await Promise.all([storage.set(TOKEN_KEY, result.token), storage.set(USER_KEY, JSON.stringify(result.user))]);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
};
