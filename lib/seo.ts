import type { Metadata } from "next";

/**
 * Central SEO config for Dz Labmarket.
 * Public marketing + catalog only — dashboards / account areas stay out of sitemap & robots.
 */

export const SITE_NAME = "Dz Labmarket";
export const SITE_TAGLINE = "Marketplace des laboratoires d'analyses";
export const SITE_DESCRIPTION =
  "Dz Labmarket connecte les laboratoires d'analyses et les fournisseurs en Algérie : réactifs, consommables, machines et services — comparez, réservez et suivez vos commandes.";

/** Production canonical origin (no trailing slash). Override with NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_FRONT_URL?.trim();
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  return "https://front-labo.vercel.app";
}

export type PublicSeoPage = {
  path: string;
  title: string;
  description: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
};

/** Indexed public pages only (no auth, dashboards, or onboarding). */
export const PUBLIC_SEO_PAGES: PublicSeoPage[] = [
  {
    path: "/home",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    changeFrequency: "daily",
    priority: 1,
  },
  {
    path: "/about",
    title: `À propos — ${SITE_NAME}`,
    description:
      "Découvrez Dz Labmarket : la marketplace qui relie laboratoires et fournisseurs en Algérie, de la recherche à la livraison.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/contact",
    title: `Contact — ${SITE_NAME}`,
    description:
      "Contactez Dz Labmarket à Blida : email, téléphone et localisation pour laboratoires et fournisseurs.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/products",
    title: `Produits & réactifs — ${SITE_NAME}`,
    description:
      "Parcourez le catalogue produits pour laboratoires : réactifs, consommables et équipements auprès de fournisseurs vérifiés.",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/products/sponsored",
    title: `Produits sponsorisés — ${SITE_NAME}`,
    description:
      "Découvrez les produits mis en avant par les fournisseurs partenaires sur Dz Labmarket.",
    changeFrequency: "daily",
    priority: 0.6,
  },
  {
    path: "/products/promotions",
    title: `Promotions — ${SITE_NAME}`,
    description:
      "Offres et promotions du moment pour laboratoires d'analyses sur Dz Labmarket.",
    changeFrequency: "daily",
    priority: 0.6,
  },
  {
    path: "/machines",
    title: `Machines & automates — ${SITE_NAME}`,
    description:
      "Catalogue de machines et automates de laboratoire : comparez les offres des fournisseurs en Algérie.",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/services",
    title: `Services laboratoire — ${SITE_NAME}`,
    description:
      "Services professionnels pour laboratoires d'analyses : maintenance, formation et prestations partenaires.",
    changeFrequency: "daily",
    priority: 0.9,
  },
];

/**
 * Paths search engines must not crawl or list.
 * Kept in sync with private app areas (dashboards, account, auth flows).
 */
export const PRIVATE_ROBOTS_DISALLOW = [
  "/dashboard",
  "/dashboard/",
  "/dashboard-supplier",
  "/dashboard-supplier/",
  "/orders",
  "/orders/",
  "/profile",
  "/profile/",
  "/favorable",
  "/favorable/",
  "/suppliers",
  "/suppliers/",
  "/client/",
  "/supplier/choose-subscription",
  "/supplier/upload-documents",
  "/login",
  "/register",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/api/",
] as const;

/** Explicit public allows (optional clarity for crawlers). */
export const PUBLIC_ROBOTS_ALLOW = [
  "/",
  "/home",
  "/about",
  "/contact",
  "/products",
  "/products/",
  "/machines",
  "/machines/",
  "/services",
  "/services/",
  "/categories/",
  "/supplier/",
] as const;

export const NO_INDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = `${getSiteUrl()}${input.path}`;
  const index = input.index !== false;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: SITE_NAME,
      locale: "fr_DZ",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : NO_INDEX_ROBOTS,
  };
}
