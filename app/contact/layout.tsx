import type { Metadata } from "next";
import type { ReactNode } from "react";
import MarketingShell from "@/components/MarketingShell";

export const metadata: Metadata = {
  title: "Contact — Dz Labmarket",
  description:
    "Contactez Dz Labmarket à Blida : email, téléphone et localisation.",
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
