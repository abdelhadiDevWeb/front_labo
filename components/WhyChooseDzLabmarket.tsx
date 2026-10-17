"use client";

import { useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Clock,
  FileCheck2,
  Layers,
  Megaphone,
  Microscope,
  MousePointerClick,
  RefreshCw,
  ShoppingCart,
  Target,
  Timer,
  Truck,
  Wallet,
  Warehouse,
  Zap,
} from "lucide-react";

type Advantage = { icon: LucideIcon; title?: string; text: string };

export const LAB_ADVANTAGES: Advantage[] = [
  { icon: Layers, text: "Multiples fournisseurs agrégés sur une interface unique." },
  {
    icon: Timer,
    title: "Gain de Temps",
    text: "Stop aux appels répétés, trouvez votre produit immédiatement.",
  },
  {
    icon: Truck,
    title: "Livraisons Rapides",
    text: "Repérez le meilleur délai d'expédition en un coup d'œil.",
  },
  {
    icon: Clock,
    title: "Commande 24h/24",
    text: "Achetez en toute autonomie, même hors des heures d'analyse.",
  },
  {
    icon: Wallet,
    title: "Budget Optimisé",
    text: "Toutes les promotions et ventes flashs regroupées au même endroit.",
  },
  {
    icon: FileCheck2,
    title: "Références Exactes",
    text: "Fiches techniques validées pour zéro erreur de commande.",
  },
  {
    icon: MousePointerClick,
    title: "Achat en 1 Clic",
    text: "Réapprovisionnez vos consommables via l'historique centralisé.",
  },
];

export const SUPPLIER_ADVANTAGES: Advantage[] = [
  {
    icon: Target,
    title: "Audience 100% Ciblée",
    text: "Visibilité nationale directe auprès des décideurs de laboratoires sur les 69 wilayas.",
  },
  {
    icon: ShoppingCart,
    title: "Ventes 24h/24 & Zéro Erreur",
    text: "Prise de commande autonome à tout moment sans erreur de référence catalogue.",
  },
  {
    icon: Megaphone,
    title: "Publicité & Promotion Scientifique",
    text: "Bannières, vidéos de démonstration, promotions ciblées et espace dédié aux webinaires/conférences.",
  },
  {
    icon: Zap,
    title: "Déstockage & Ventes Flash",
    text: "Liquidation accélérée des réactifs à DLC courte et achats groupés à fort volume.",
  },
  {
    icon: BarChart3,
    title: "Gain de Temps & Analytics",
    text: "Automatisation des commandes, grilles tarifaires sur-mesure et statistiques en temps réel.",
  },
  {
    icon: RefreshCw,
    title: "Image & Réapprovisionnement",
    text: "Modernisation de votre image de marque et commande récurrente en 1 clic pour vos clients.",
  },
];

type Audience = "lab" | "supplier";

const AUDIENCES: Record<
  Audience,
  {
    tab: string;
    icon: LucideIcon;
    items: Advantage[];
    featured: string;
    iconTile: string;
    hoverBorder: string;
    cta: { href: string; label: string; className: string };
  }
> = {
  lab: {
    tab: "Pour les laboratoires",
    icon: Microscope,
    items: LAB_ADVANTAGES,
    featured: "from-[#06142e] via-blue-950 to-blue-800",
    iconTile: "from-blue-600 to-cyan-500 shadow-blue-600/25",
    hoverBorder: "hover:border-blue-200",
    cta: {
      href: "/register?type=client",
      label: "Créer mon compte laboratoire",
      className: "from-blue-600 to-cyan-500",
    },
  },
  supplier: {
    tab: "Pour les fournisseurs",
    icon: Warehouse,
    items: SUPPLIER_ADVANTAGES,
    featured: "from-[#04201a] via-emerald-950 to-emerald-800",
    iconTile: "from-emerald-600 to-teal-500 shadow-emerald-600/25",
    hoverBorder: "hover:border-emerald-200",
    cta: {
      href: "/register?type=supplier",
      label: "Créer mon compte fournisseur",
      className: "from-emerald-600 to-teal-500",
    },
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "Pourquoi choisir" advantages, split between laboratories and suppliers. */
export default function WhyChooseDzLabmarket() {
  const [audience, setAudience] = useState<Audience>("lab");
  const current = AUDIENCES[audience];
  const [featured, ...rest] = current.items;
  const FeaturedIcon = featured.icon;
  // Featured card fills 2 cells; the CTA stretches over whatever is left of the last row.
  const usedCells = 2 + rest.length;
  const ctaSpan = `${usedCells % 2 === 0 ? "sm:col-span-2" : ""} ${9 - usedCells === 2 ? "lg:col-span-2" : "lg:col-span-1"}`;

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Avantages par profil"
          className="inline-flex max-w-full overflow-x-auto rounded-full border border-gray-200 bg-white p-1 sm:p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(Object.keys(AUDIENCES) as Audience[]).map((key) => {
            const { tab, icon: TabIcon } = AUDIENCES[key];
            const active = key === audience;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`why-tab-${key}`}
                aria-selected={active}
                aria-controls="why-panel"
                onClick={() => setAudience(key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 sm:gap-2 rounded-full px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                  active
                    ? `bg-gradient-to-r ${AUDIENCES[key].cta.className} text-white shadow-md`
                    : "text-gray-600 active:text-gray-900 sm:hover:text-gray-900"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={audience}
        id="why-panel"
        role="tabpanel"
        aria-labelledby={`why-tab-${audience}`}
        className="mt-5 sm:mt-10 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article
          className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br ${current.featured} p-5 sm:p-8 text-white shadow-xl sm:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col animate-fade-in-up`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <span className="relative flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <FeaturedIcon className="h-5 w-5 sm:h-7 sm:w-7" />
          </span>
          <div className="relative mt-auto pt-6 sm:pt-10">
            <span className="text-xs sm:text-sm font-semibold text-white/60">{pad(1)}</span>
            {featured.title ? (
              <>
                <h3 className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold tracking-tight leading-tight">
                  {featured.title}
                </h3>
                <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed text-white/75">{featured.text}</p>
              </>
            ) : (
              <h3 className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold tracking-tight leading-tight">
                {featured.text}
              </h3>
            )}
          </div>
        </article>

        {rest.map(({ icon: Icon, title, text }, i) => (
          <article
            key={text}
            style={{ animationDelay: `${(i + 1) * 70}ms` }}
            className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm transition-shadow duration-300 sm:hover:-translate-y-1 sm:hover:shadow-xl ${current.hoverBorder} animate-fade-in-up`}
          >
            <span className="absolute right-3 top-3 sm:right-5 sm:top-4 text-2xl sm:text-3xl font-bold text-gray-100">
              {pad(i + 2)}
            </span>
            <span
              className={`relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${current.iconTile} text-white shadow-md`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            {title ? <h3 className="relative mt-3 sm:mt-5 text-sm sm:text-lg font-bold text-gray-900">{title}</h3> : null}
            <p className={`relative text-xs sm:text-sm leading-relaxed text-gray-600 ${title ? "mt-1.5 sm:mt-2" : "mt-3 sm:mt-5 font-semibold text-gray-900"}`}>
              {text}
            </p>
          </article>
        ))}

        <Link
          href={current.cta.href}
          style={{ animationDelay: `${(rest.length + 1) * 70}ms` }}
          className={`group flex min-h-12 items-center justify-between gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${current.cta.className} p-4 sm:p-6 text-white shadow-lg transition-shadow duration-300 sm:hover:shadow-2xl ${ctaSpan} animate-fade-in-up`}
        >
          <span className="text-sm sm:text-lg font-bold leading-snug">{current.cta.label}</span>
          <span className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
