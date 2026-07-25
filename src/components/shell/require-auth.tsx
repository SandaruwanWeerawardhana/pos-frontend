"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { ROUTES } from "@/lib/types/routes";

// Client-side route guard. Auth is persisted to localStorage via Zustand, so a
// server middleware can't see it — this waits for persist rehydration, then
// redirects to /auth/login when no token is present. Rendering null until hydrated
// avoids a false redirect on first paint for already-authenticated users.
export function RequireAuth({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated && !token) router.replace(ROUTES.auth.login);
  }, [hydrated, token, router]);

  if (!hydrated || !token) return null;
  return <>{children}</>;
}
