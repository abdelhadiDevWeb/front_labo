import type { Metadata } from "next";
import { buildPageMetadata, PUBLIC_SEO_PAGES } from "@/lib/seo";

const page = PUBLIC_SEO_PAGES.find((p) => p.path === "/products/sponsored")!;

export const metadata: Metadata = buildPageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
});

export default function SponsoredProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
