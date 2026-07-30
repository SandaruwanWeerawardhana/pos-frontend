import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient, type AuthUser, type ProfileUpdate } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  /** Epoch ms at which the token stops being accepted; null when unknown. */
  expiresAt: number | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    ownerName: string,
    businessName: string,
    email: string,
    password: string,
    businessType: string,
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (update: ProfileUpdate) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

interface JwtPayload {
  exp?: number;
}

function decodeBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
}

// Reads `exp` out of the JWT so the client can end the session at the right
// moment instead of waiting for the next API call to 401. Returns null for
// anything unparseable — an unreadable token is treated as "no known expiry"
// rather than "expired", so a token-format change can't lock everyone out.
export function readTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const parsed = JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    if (typeof parsed.exp !== "number") return null;
    // Standard JWTs express `exp` in seconds; values already in milliseconds
    // (as the mock backend emits) pass through unchanged.
    return parsed.exp > 1e12 ? parsed.exp : parsed.exp * 1000;
  } catch {
    return null;
  }
}

// Wraps the existing apiClient (mock/real split already handled in
// src/lib/api). Session persisted to localStorage so a reload stays logged in.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      expiresAt: null,
      async login(email, password) {
        const result = await apiClient.login(email, password);
        set({
          user: result.user,
          token: result.token,
          expiresAt: readTokenExpiry(result.token),
        });
      },
      async register(ownerName, businessName, email, password, businessType) {
        const result = await apiClient.register(
          ownerName,
          businessName,
          email,
          password,
          businessType,
        );
        set({
          user: result.user,
          token: result.token,
          expiresAt: readTokenExpiry(result.token),
        });
      },
      logout() {
        set({ user: null, token: null, expiresAt: null });
      },
      async updateProfile(update) {
        const user = await apiClient.updateProfile(update);
        set({ user });
      },
      async changePassword(currentPassword, newPassword) {
        // The backend rotates the credential, not the token, so the current
        // session deliberately stays valid after a successful change.
        await apiClient.changePassword(currentPassword, newPassword);
      },
    }),
    { name: "pos_auth_v1" },
  ),
);

export function isSessionExpired(state: {
  token: string | null;
  expiresAt: number | null;
}): boolean {
  if (!state.token) return false;
  if (state.expiresAt === null) return false;
  return state.expiresAt <= Date.now();
}
