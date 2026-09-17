import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo-private";

export const metadata: Metadata = buildPrivateMetadata("Mes réserves");

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
