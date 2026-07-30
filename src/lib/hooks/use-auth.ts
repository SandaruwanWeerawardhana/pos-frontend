"use client";

import { useAuthStore } from "@/lib/store/auth";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const logout = useAuthStore((state) => state.logout);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);

  return {
    user,
    token,
    expiresAt,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };
}
