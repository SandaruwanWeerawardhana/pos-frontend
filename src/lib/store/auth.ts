import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient, type AuthUser } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Wraps the existing apiClient.login (mock/real split already handled in
// src/lib/api). Session persisted to localStorage so a reload stays logged in.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      async login(email, password) {
        const result = await apiClient.login(email, password);
        set({ user: result.user, token: result.token });
      },
      async register(name, email, password) {
        const result = await apiClient.register(name, email, password);
        set({ user: result.user, token: result.token });
      },
      logout() {
        set({ user: null, token: null });
      },
    }),
    { name: "pos_auth_v1" },
  ),
);
