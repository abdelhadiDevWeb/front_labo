import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Fournisseurs");

export default function SuppliersListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
