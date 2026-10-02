import type { Metadata } from "next";
import type { ReactNode } from "react";
import MarketingShell from "@/components/MarketingShell";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Live",
  description:
    "Le Live de Dz Labmarket : les fournisseurs présentent leurs produits en direct et les laboratoires s'informent, comme une conférence en ligne.",
  path: "/live",
  index: false,
});

export default function LiveLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
