"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuthSession } from "@/lib/api";

export function useAuthGuard(redirectTo = "/login") {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const ok = await checkAuthSession();
        if (cancelled) return;

        if (!ok) {
          setIsAuthenticated(false);
          setIsChecking(false);
          router.replace(redirectTo);
          return;
        }

        setIsAuthenticated(true);
        setIsChecking(false);
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
        setIsChecking(false);
        router.replace(redirectTo);
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  return { isChecking, isAuthenticated };
}
