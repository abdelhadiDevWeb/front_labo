"use client";

import type { ReactNode } from "react";
import { PublicSiteShell } from "@/components/PublicSiteShell";

export default function MarketingShell({ children }: { children: ReactNode }) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}
