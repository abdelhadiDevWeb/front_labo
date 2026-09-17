import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Documents fournisseur");

export default function SupplierUploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
