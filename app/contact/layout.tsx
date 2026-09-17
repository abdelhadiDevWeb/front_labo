import type { Metadata } from "next";
import type { ReactNode } from "react";
import MarketingShell from "@/components/MarketingShell";
import { buildPageMetadata, PUBLIC_SEO_PAGES } from "@/lib/seo";

const page = PUBLIC_SEO_PAGES.find((p) => p.path === "/contact")!;

export const metadata: Metadata = buildPageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
});

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
