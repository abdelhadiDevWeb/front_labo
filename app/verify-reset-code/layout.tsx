import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Vérification du code");

export default function VerifyResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
