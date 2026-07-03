"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ChooseSubscriptionContent from "@/components/ChooseSubscriptionContent";

function SupplierChooseSubscriptionInner() {
  return (
    <ChooseSubscriptionContent
      role="supplier"
      backHref="/supplier/upload-documents"
      dashboardHref="/dashboard-supplier"
      pageTitle="Choisissez votre abonnement"
      pageSubtitle="Sélectionnez l'offre qui correspond à votre activité de fournisseur"
      documentLabel="documents"
    />
  );
}

export default function SupplierChooseSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <SupplierChooseSubscriptionInner />
    </Suspense>
  );
}
