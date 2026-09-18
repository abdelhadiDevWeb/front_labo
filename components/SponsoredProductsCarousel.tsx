"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Package, ArrowRight } from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import SponsoredProductCard from "@/components/SponsoredProductCard";

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function SponsoredProductsCarousel() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomDelay] = useState(() => -(Math.random() * 20 + 5));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getSponsoredProducts();
        if (cancelled) return;
        if (result.success && result.data?.products?.length) {
          setProducts(shuffleArray(result.data.products));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldScroll = products.length > 4;

  const loopProducts = useMemo(() => {
    if (products.length === 0) return [];
    return shouldScroll ? [...products, ...products] : products;
  }, [products, shouldScroll]);

  const animationDuration = Math.max(products.length * 7, 28);

  if (isLoading) {
    return (
      <section id="sponsored-section" className="py-10 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 scroll-mt-24">
        <div className="container mx-auto px-4">
          <div className="h-8 w-64 bg-white/10 rounded-lg animate-pulse mb-6" />
          <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      id="sponsored-section"
      className="relative py-10 sm:py-12 overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 scroll-mt-24"
    >
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.35),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.35),transparent_40%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-semibold mb-3">
              <Megaphone className="w-3.5 h-3.5" />
              Produits mis en avant
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Sélection sponsorisée</h2>
            <p className="text-sm sm:text-base text-blue-100/80 mt-1">
              Découvrez les produits recommandés par nos fournisseurs partenaires
            </p>
          </div>
          <Link
            href="/products/sponsored"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold text-white transition-colors border border-white/20"
          >
            <Package className="w-4 h-4" />
            Voir tous les produits sponsorisés
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="relative">
        {shouldScroll && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-blue-950 to-transparent z-10 pointer-events-none" />
          </>
        )}

        <div className={shouldScroll ? "overflow-hidden py-2" : "container mx-auto px-4 sm:px-6 lg:px-8 py-2"}>
          <div
            className={
              shouldScroll
                ? "sponsored-marquee-track flex gap-5 sm:gap-6 px-4"
                : "flex flex-wrap justify-center gap-5 sm:gap-6"
            }
            style={
              shouldScroll
                ? {
                    animationDuration: `${animationDuration}s`,
                    animationDelay: `${randomDelay}s`,
                  }
                : undefined
            }
          >
            {loopProducts.map((product, index) => (
              <SponsoredProductCard key={`${product.id}-${index}`} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
