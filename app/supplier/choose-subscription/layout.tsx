import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Onboarding fournisseur");

export default function SupplierChooseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
