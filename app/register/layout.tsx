import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Inscription");

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
