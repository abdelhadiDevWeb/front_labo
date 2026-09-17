import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Espace laboratoire");

export default function ClientAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
