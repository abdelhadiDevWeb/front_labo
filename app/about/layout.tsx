import type { Metadata } from "next";
import type { ReactNode } from "react";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "À propos — Dz Labmarket",
  description:
    "Découvrez Dz Labmarket : la marketplace qui connecte laboratoires et fournisseurs en Algérie.",
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
