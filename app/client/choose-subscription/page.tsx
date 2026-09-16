"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ChooseSubscriptionContent from "@/components/ChooseSubscriptionContent";

function ClientChooseSubscriptionInner() {
  return (
    <ChooseSubscriptionContent
      role="client"
      backHref="/login"
      dashboardHref="/home"
      pageTitle="Choisissez votre abonnement"
      pageSubtitle="Sélectionnez l'offre adaptée à votre laboratoire — paiement en main propre (demande envoyée à l'admin)"
      documentLabel="documents"
    />
  );
}

export default function ClientChooseSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ClientChooseSubscriptionInner />
    </Suspense>
  );
}
