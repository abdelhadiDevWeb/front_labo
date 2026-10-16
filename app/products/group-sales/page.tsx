"use client";

import dynamic from "next/dynamic";
import { Users } from "lucide-react";
import BackButton from "@/components/BackButton";

const GroupSelleShowcase = dynamic(() => import("@/components/GroupSelleShowcase"), {
  ssr: false,
  loading: () => null,
});

export default function GroupSalesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <BackButton
            fallbackHref="/home#group-sell-section"
            className="inline-flex items-center gap-2 text-sm text-teal-100 hover:text-white mb-4 transition-colors"
            iconClassName="w-4 h-4"
            label="Retour"
          />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20">
              <Users className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Ventes groupées</h1>
          </div>
          <p className="text-teal-50/90 text-sm sm:text-base max-w-2xl">
            Rejoignez une vente groupée et indiquez votre quantité — quand l&apos;objectif est
            atteint, la réserve est créée automatiquement au prix groupé.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GroupSelleShowcase variant="page" />
      </main>
    </div>
  );
}
