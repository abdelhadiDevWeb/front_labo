import type { MetadataRoute } from "next";
import {
  getSiteUrl,
  PRIVATE_ROBOTS_DISALLOW,
  PUBLIC_ROBOTS_ALLOW,
} from "@/lib/seo";

/**
 * robots.txt — allow public marketing/catalog only; hide private app areas.
 * Served at /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  let host = "front-labo.vercel.app";
  try {
    host = new URL(site).host;
  } catch {
    /* keep default */
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_ROBOTS_ALLOW],
        disallow: [...PRIVATE_ROBOTS_DISALLOW],
      },
      {
        userAgent: "Googlebot",
        allow: [...PUBLIC_ROBOTS_ALLOW],
        disallow: [...PRIVATE_ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host,
  };
}
