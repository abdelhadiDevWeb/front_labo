"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSponsoredProducts } from "@/hooks/useSponsoredProducts";
import SponsoredProductCard from "@/components/SponsoredProductCard";

/**
 * Mid-page “En vedette” row — native catalog-style sponsored cards.
 */
export default function HomeSponsoredFeatured() {
  const { products, loaded } = useSponsoredProducts();

  if (!loaded) {
    return (
      <section
        className="border-y border-slate-100 bg-gradient-to-b from-slate-50 to-white py-10 sm:py-12"
        aria-hidden
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 w-[280px] shrink-0 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section
      id="en-vedette"
      className="relative scroll-mt-24 overflow-hidden border-y border-slate-100 bg-gradient-to-b from-slate-50 via-white to-white py-12 sm:py-14 md:py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cyan-100/50 blur-3xl"
      />

      <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              En vedette
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
              Annonces sponsorisées
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
              Sélection mise en avant par nos fournisseurs partenaires
            </p>
          </div>
          <Link
            href="/products/sponsored"
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:self-auto"
          >
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scroll-smooth snap-x snap-mandatory sm:mx-0 sm:gap-5 sm:px-0 [scrollbar-width:thin]">
          {products.map((product) => (
            <div key={product.id} className="snap-start">
              <SponsoredProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
