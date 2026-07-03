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
      const ok = await checkAuthSession();
      if (cancelled) return;
      if (!ok) {
        router.replace(redirectTo);
        return;
      }
      setIsAuthenticated(true);
      setIsChecking(false);
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  return { isChecking, isAuthenticated };
}
