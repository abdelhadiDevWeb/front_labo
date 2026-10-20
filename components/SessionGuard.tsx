"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { verifySessionStatus } from "@/lib/api";

/** Pages that need a logged-in user (admin, supplier and lab spaces). */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/dashboard-supplier",
  "/orders",
  "/statistics",
  "/profile",
  "/favorable",
  "/suppliers",
];

const isPrivatePath = (pathname: string) =>
  PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const HIDE_ATTR = "data-session-check";

/**
 * Re-validates the session whenever a private page is shown again — browser Back/Forward
 * (including pages restored from the back/forward cache), tab refocus, in-app history.
 * After logout the user is sent to /login instead of seeing the old space.
 */
export default function SessionGuard() {
  const pathname = usePathname() || "";
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let checking = false;

    const check = async (hideWhileChecking: boolean) => {
      const path = window.location.pathname;
      if (!isPrivatePath(path) || checking) return;
      checking = true;
      const root = document.documentElement;
      if (hideWhileChecking) root.setAttribute(HIDE_ATTR, "");
      try {
        const status = await verifySessionStatus();
        if (status === "invalid") {
          window.location.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
      } finally {
        checking = false;
      }
      root.removeAttribute(HIDE_ATTR);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check(true);
    };
    const onPopState = () => void check(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check(false);
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibility);
      document.documentElement.removeAttribute(HIDE_ATTR);
    };
  }, []);

  // Client-side navigation into a private space (e.g. history.back inside the app).
  useEffect(() => {
    if (!isPrivatePath(pathname)) return;
    let cancelled = false;
    void verifySessionStatus().then((status) => {
      if (!cancelled && status === "invalid" && pathRef.current === pathname) {
        window.location.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
