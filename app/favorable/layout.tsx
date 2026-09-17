import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Favoris");

export default function FavorableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
