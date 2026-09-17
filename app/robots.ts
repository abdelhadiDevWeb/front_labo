import type { MetadataRoute } from "next";
import {
  DEFAULT_SITE_URL,
  getSiteUrl,
  PRIVATE_ROBOTS_DISALLOW,
  PUBLIC_ROBOTS_ALLOW,
} from "@/lib/seo";

/**
 * robots.txt — allow public marketing/catalog only; hide private app areas.
 * Served at /robots.txt
 * Canonical host: https://dzlabmarket.com
 */
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  let host = "dzlabmarket.com";
  try {
    host = new URL(site || DEFAULT_SITE_URL).host;
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
