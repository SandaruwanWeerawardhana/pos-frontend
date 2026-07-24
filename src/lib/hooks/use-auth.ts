"use client";

import { useAuthStore } from "@/lib/store/auth";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
  };
}
