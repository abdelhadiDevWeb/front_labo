"use client";

import CatalogPrice from "@/components/CatalogPrice";
import PriceWatermark from "@/components/PriceWatermark";
import UniqueDataFields from "@/components/UniqueDataFields";

if (typeof window !== "undefined") {
  const original = window.fetch.bind(window);
  window.fetch = (input, init) =>
    String(input instanceof Request ? input.url : input).includes("/client/role")
      ? Promise.resolve(
          new Response(
            JSON.stringify({ success: true, data: { role: "client", email: "labo.test@exemple.dz" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      : original(input, init);
}

export default function TmpWatermarkPage() {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Prix</h2>
        <CatalogPrice amount={12500} visible className="text-3xl sm:text-4xl font-bold text-blue-600" watermark />
      </div>
      <div className="space-y-4">
        <CatalogPrice amount={98000} visible className="text-2xl font-bold text-blue-600" watermark />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Détails</h2>
        <PriceWatermark>
          <UniqueDataFields data={{ Marque: "Mindray", Prix: "45 000 DA", Garantie: "12 mois" }} max={40} className="max-h-none" />
        </PriceWatermark>
      </div>
    </div>
  );
}
