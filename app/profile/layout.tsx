import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Mon profil");

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
