"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordNavigation } from "@/lib/nav-history";

/**
 * Records in-app page visits so "Retour" buttons can go back inside the site.
 * Path only: query-only updates (filters) often use history.replace and must not count as a page.
 */
export default function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) recordNavigation(pathname);
  }, [pathname]);

  return null;
}
