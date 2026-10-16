"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Percent,
  Package,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { getPublicPromotions, markPromotionsSeen, PublicPromotion } from "@/lib/api";
import PromotionCard from "@/components/PromotionCard";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { scrollToCatalogFilters } from "@/lib/catalog-filters";
import BackButton from "@/components/BackButton";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getPublicPromotions();
        if (result.success && result.data) {
          setPromotions(result.data.promotions || []);
          void markPromotionsSeen();
        } else {
          setError(result.message || "Erreur lors du chargement");
        }
      } catch {
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const filteredPromotions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((p) => {
      const product = p.product;
      if (!product) return false;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.brand?.toLowerCase().includes(q) ?? false) ||
        (product.category?.toLowerCase().includes(q) ?? false) ||
        (product.supplierName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [promotions, searchTerm]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <header className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 text-white">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
            <BackButton
              fallbackHref="/home#promotions-section"
              className="inline-flex items-center gap-2 text-sm text-orange-100 hover:text-white transition-colors"
              iconClassName="w-4 h-4"
              label={<span>Retour</span>}
            />
            <button
              type="button"
              onClick={() => scrollToCatalogFilters()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/25"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
            </button>
          </div>
          <div className="flex items-center gap-3 mb-2 min-w-0">
            <div className="p-2 rounded-xl bg-white/20 shrink-0">
              <Percent className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold truncate">Produits en promotion</h1>
          </div>
          <p className="text-orange-100/90 text-sm sm:text-base max-w-2xl">
            Tous les produits avec une offre promotionnelle active — quantité minimum, et produit offert gratuitement si applicable
          </p>
          <div className="mt-3 sm:mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-orange-200" />
            {promotions.length} promotion{promotions.length > 1 ? "s" : ""} en cours
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div
          id="catalog-filters"
          className="scroll-mt-4 mb-4 sm:mb-6 relative max-w-xl sticky top-2 z-10"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit en promotion..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none text-sm sm:text-base shadow-sm"
          />
        </div>

        {filteredPromotions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredPromotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} className="w-full min-w-0" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center">
            <Package className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? "Aucun résultat" : "Aucune promotion en cours"}
            </h2>
            <p className="text-gray-600 mb-6 text-sm sm:text-base">
              {searchTerm
                ? "Essayez un autre terme de recherche"
                : "Revenez plus tard pour découvrir les offres spéciales"}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              Voir tous les produits
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
