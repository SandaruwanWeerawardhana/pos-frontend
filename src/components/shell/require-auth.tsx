"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { ROUTES } from "@/lib/types/routes";

function subscribeAuthHydration(onStoreChange: () => void) {
  return useAuthStore.persist?.onFinishHydration(onStoreChange) ?? (() => {});
}

function getAuthHydrationSnapshot() {
  return useAuthStore.persist?.hasHydrated?.() ?? true;
}

// Client-side route guard. Auth is persisted to localStorage via Zustand, so a
// server middleware can't see it — this waits for persist rehydration, then
// redirects to /auth/login when no token is present. Rendering null until hydrated
// avoids a false redirect on first paint for already-authenticated users.
export function RequireAuth({
  children,
}: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const hydrated = useSyncExternalStore(
    subscribeAuthHydration,
    getAuthHydrationSnapshot,
    () => false,
  );

  useEffect(() => {
    if (hydrated && !token) router.replace(ROUTES.auth.login);
  }, [hydrated, token, router]);

  if (!hydrated || !token) return null;
  return <>{children}</>;
}
