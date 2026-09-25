import type { Metadata } from "next";
import { buildPageMetadata, SITE_NAME } from "@/lib/seo";
import { resolveEnvApiUrl } from "@/lib/api-url";

type Props = { params: Promise<{ id: string }> };

async function fetchProductName(id: string): Promise<string | null> {
  const apiBase =
    resolveEnvApiUrl(process.env.API_INTERNAL_URL) ||
    resolveEnvApiUrl(process.env.NEXT_PUBLIC_API_URL);
  if (!apiBase || apiBase.startsWith("/")) return null;

  try {
    const res = await fetch(
      `${apiBase.replace(/\/$/, "")}/products/public/${id}`,
      { next: { revalidate: 1800 }, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { name?: string; designation?: string };
      name?: string;
    };
    return (
      json.data?.name ||
      json.data?.designation ||
      json.name ||
      null
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const name = await fetchProductName(id);
  const title = name
    ? `${name} — Réactif`
    : `Réactif laboratoire`;
  const description = name
    ? `${name} sur ${SITE_NAME} : fiche réactif, disponibilité et réservation auprès de fournisseurs vérifiés en Algérie.`
    : `Fiche réactif laboratoire sur ${SITE_NAME} — comparez et réservez auprès de fournisseurs en Algérie.`;

  return buildPageMetadata({
    title,
    description,
    path: `/products/${id}`,
  });
}

export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
