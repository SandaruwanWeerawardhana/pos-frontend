"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isSessionExpired, useAuthStore } from "@/lib/store/auth";
import { ROUTES } from "@/lib/types/routes";
import { Skeleton } from "@/components/ui/Skeleton";

function subscribeAuthHydration(onStoreChange: () => void) {
  return useAuthStore.persist?.onFinishHydration(onStoreChange) ?? (() => {});
}

function getAuthHydrationSnapshot() {
  return useAuthStore.persist?.hasHydrated?.() ?? true;
}

// How often the guard re-checks the token's expiry while a session is open.
const EXPIRY_CHECK_INTERVAL_MS = 30_000;

// Client-side route guard. Auth is persisted to localStorage via Zustand, so a
// server middleware can't see it — this waits for persist rehydration, then
// redirects to /auth/login when no token is present. Rendering a skeleton until
// hydrated avoids a false redirect on first paint for already-authenticated users.
export function RequireAuth({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const logout = useAuthStore((state) => state.logout);
  const hydrated = useSyncExternalStore(
    subscribeAuthHydration,
    getAuthHydrationSnapshot,
    () => false,
  );

  useEffect(() => {
    if (hydrated && !token) router.replace(ROUTES.auth.login);
  }, [hydrated, token, router]);

  // A session can expire while the tab sits open on a till nobody has touched
  // for hours. Polling the stored expiry ends it locally instead of leaving a
  // dead token in place until the next request happens to fail.
  useEffect(() => {
    if (!token) return;

    function checkExpiry() {
      if (isSessionExpired({ token, expiresAt })) {
        logout();
        router.replace(`${ROUTES.auth.login}?reason=expired`);
      }
    }

    checkExpiry();
    const timer = window.setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [token, expiresAt, logout, router]);

  if (!hydrated) {
    return (
      <output
        aria-label="Checking your session"
        className="flex flex-1 flex-col gap-4 p-6"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </output>
    );
  }

  if (!token) return null;
  return <>{children}</>;
}
