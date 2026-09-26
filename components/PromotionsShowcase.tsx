"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Percent, ArrowRight, Sparkles } from "lucide-react";
import { getPublicPromotions, PublicPromotion } from "@/lib/api";
import PromotionCard from "@/components/PromotionCard";

export default function PromotionsShowcase() {
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getPublicPromotions();
        if (cancelled) return;
        if (result.success && result.data?.promotions?.length) {
          setPromotions(result.data.promotions);
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

  if (isLoading || promotions.length === 0) {
    return null;
  }

  return (
    <section id="promotions-section" className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-orange-50 via-white to-white scroll-mt-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Offres spéciales
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Percent className="w-8 h-8 text-orange-500" />
            Promotions en cours
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto">
            Profitez de prix réduits — et parfois un produit offert gratuitement
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {promotions.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} />
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/products/promotions"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl"
          >
            Voir tous les produits en promotion
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
