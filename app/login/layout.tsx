import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Connexion");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
