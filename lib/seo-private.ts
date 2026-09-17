import type { Metadata } from "next";
import { NO_INDEX_ROBOTS, SITE_NAME } from "@/lib/seo";

/** Shared noindex metadata for private / auth utility pages. */
export const privatePageRobots: Metadata = {
  robots: NO_INDEX_ROBOTS,
  title: SITE_NAME,
};

export function buildPrivateMetadata(title: string): Metadata {
  return {
    title,
    description: "Espace privé Dz Labmarket — non indexé.",
    robots: NO_INDEX_ROBOTS,
    alternates: { canonical: undefined },
  };
}
