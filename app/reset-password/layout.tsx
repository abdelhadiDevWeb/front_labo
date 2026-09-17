import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Réinitialisation");

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
