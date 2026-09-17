import type { MetadataRoute } from "next";
import { getSiteUrl, PUBLIC_SEO_PAGES } from "@/lib/seo";
import { resolveEnvApiUrl } from "@/lib/api-url";

type IdRow = { id: string; updatedAt?: string };

function collectIds(payload: unknown): IdRow[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const data = root.data;

  const buckets: unknown[] = [];
  if (Array.isArray(data)) buckets.push(...data);
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["products", "machines", "services", "categories", "items"]) {
      if (Array.isArray(d[key])) buckets.push(...(d[key] as unknown[]));
    }
  }
  for (const key of ["products", "machines", "services", "categories"]) {
    if (Array.isArray(root[key])) buckets.push(...(root[key] as unknown[]));
  }

  const out: IdRow[] = [];
  for (const item of buckets) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id || row._id || "").trim();
    if (!id) continue;
    out.push({
      id,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    });
  }
  return out;
}

async function fetchPublicIds(apiPath: string): Promise<IdRow[]> {
  const apiBase =
    resolveEnvApiUrl(process.env.API_INTERNAL_URL) ||
    resolveEnvApiUrl(process.env.NEXT_PUBLIC_API_URL);
  if (!apiBase || apiBase.startsWith("/")) return [];

  try {
    const url = new URL(`${apiBase.replace(/\/$/, "")}${apiPath}`);
    if (!url.searchParams.has("limit")) url.searchParams.set("limit", "200");

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    return collectIds(await res.json());
  } catch {
    return [];
  }
}

/**
 * sitemap.xml — public pages only (no dashboards, account, or auth).
 * Served at /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${site}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...PUBLIC_SEO_PAGES.map((page) => ({
      url: `${site}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  ];

  const [products, machines, services, categories] = await Promise.all([
    fetchPublicIds("/products/public"),
    fetchPublicIds("/machines/public"),
    fetchPublicIds("/services/public"),
    fetchPublicIds("/categories/public"),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...products.map((p) => ({
      url: `${site}/products/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...machines.map((m) => ({
      url: `${site}/machines/${m.id}`,
      lastModified: m.updatedAt ? new Date(m.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...services.map((s) => ({
      url: `${site}/services/${s.id}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...categories.map((c) => ({
      url: `${site}/categories/${c.id}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
