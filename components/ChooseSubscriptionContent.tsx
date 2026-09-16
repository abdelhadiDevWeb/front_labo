"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  HandCoins,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Megaphone,
  Sparkles,
  Clock,
} from "lucide-react";
import {
  getPublicSubscriptionPlans,
  registerHandToHandAbonnement,
  verifyAbonnementPayment,
  SubscriptionType,
} from "@/lib/api";
import RegistrationPendingModal from "@/components/RegistrationPendingModal";

interface ChooseSubscriptionContentProps {
  role: "supplier" | "client";
  backHref: string;
  dashboardHref: string;
  pageTitle: string;
  pageSubtitle: string;
  documentLabel: string;
}

export default function ChooseSubscriptionContent({
  role: _role,
  backHref,
  dashboardHref,
  pageTitle,
  pageSubtitle,
  documentLabel,
}: ChooseSubscriptionContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState<SubscriptionType[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingPlanName, setPendingPlanName] = useState<string | undefined>();

  const loadPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    const result = await getPublicSubscriptionPlans();
    if (result.success && result.data?.subscriptionTypes) {
      setPlans(result.data.subscriptionTypes);
    } else {
      setError(result.message || "Impossible de charger les abonnements");
    }
    setIsLoadingPlans(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const ref = searchParams.get("ref");

    if (payment !== "success" || !ref) {
      if (payment === "failed") {
        setError("Le paiement a échoué ou a été annulé. Veuillez réessayer.");
      }
      return;
    }

    let cancelled = false;

    const verifyWithRetry = async () => {
      setIsProcessing(true);
      const maxAttempts = 8;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await verifyAbonnementPayment(ref);
        if (cancelled) return;

        if (result.success && result.data?.paid) {
          router.replace(dashboardHref);
          return;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      setIsProcessing(false);
      setError("Paiement en cours de confirmation. Veuillez patienter quelques instants et actualiser la page.");
    };

    verifyWithRetry();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, dashboardHref]);

  const handleSelectPlan = (plan: SubscriptionType) => {
    setSelectedPlan(plan);
    setShowPaymentOptions(true);
    setError(null);
  };

  const handleHandToHand = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    setError(null);

    const result = await registerHandToHandAbonnement(selectedPlan.id);
    setIsProcessing(false);

    if (result.success) {
      setPendingPlanName(selectedPlan.name);
      setShowPendingModal(true);
    } else {
      setError(result.message || "Une erreur est survenue");
    }
  };

  const formatDuration = (days: number) => {
    if (days >= 30 && days % 30 === 0) {
      const months = days / 30;
      return `${months} mois`;
    }
    return `${days} jour${days > 1 ? "s" : ""}`;
  };

  const formatSponsorHours = (hours: number) => {
    if (hours >= 24 && hours % 24 === 0) {
      const days = hours / 24;
      return `${hours} h (${days} jour${days > 1 ? "s" : ""})`;
    }
    return `${hours} heure${hours > 1 ? "s" : ""}`;
  };

  const renderSponsorInfo = (plan: SubscriptionType) => {
    const sponsorsCount = plan.sponsorsPerMonth ?? 0;
    const durationHours =
      plan.sponsorDurationHours && plan.sponsorDurationHours >= 1
        ? plan.sponsorDurationHours
        : sponsorsCount > 0
          ? 48
          : 0;

    if (sponsorsCount <= 0) {
      return (
        <div className="flex items-start gap-2 text-gray-500 text-sm">
          <Megaphone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <span>Aucun sponsoring inclus</span>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 text-sm font-medium">
          <Megaphone className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {sponsorsCount} sponsor{sponsorsCount > 1 ? "s" : ""} inclus
          </span>
        </div>
        <div className="flex items-center gap-2 text-amber-900 text-sm font-medium">
          <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Temps de chaque sponsor&nbsp;: {formatSponsorHours(durationHours)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour aux documents</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
          <p className="text-gray-600">{pageSubtitle}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {isProcessing && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-700 text-sm">Vérification du paiement en cours...</p>
          </div>
        )}

        {!showPaymentOptions ? (
          isLoadingPlans ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <p className="text-gray-600">Aucun abonnement disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all p-6 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  {plan.description && (
                    <p className="text-gray-600 text-sm mb-4 flex-1">{plan.description}</p>
                  )}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-gray-700 text-sm">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Durée de l&apos;abonnement&nbsp;: {formatDuration(plan.time)}</span>
                    </div>
                    {renderSponsorInfo(plan)}
                  </div>
                  <div className="mt-auto">
                    <p className="text-3xl font-bold text-blue-600 mb-4">
                      {plan.price.toLocaleString("fr-DZ")}{" "}
                      <span className="text-lg font-medium">DZD</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
                    >
                      Choisir ce plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          selectedPlan && (
            <div className="max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentOptions(false);
                  setSelectedPlan(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Choisir un autre plan
              </button>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
                <div className="text-center mb-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedPlan.name}</h2>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {selectedPlan.price.toLocaleString("fr-DZ")} DZD
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Durée de l&apos;abonnement&nbsp;: {formatDuration(selectedPlan.time)}
                  </p>
                  <div className="mt-4 text-left max-w-sm mx-auto">
                    {renderSponsorInfo(selectedPlan)}
                  </div>
                </div>

                <p className="text-gray-700 text-center mb-6">
                  Comment souhaitez-vous régler votre abonnement ?
                </p>

                <div className="space-y-4">
                  {/* Online payment — coming soon */}
                  <div
                    aria-disabled="true"
                    className="relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-5 opacity-90 cursor-not-allowed select-none"
                  >
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-200/30 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-slate-200/40 blur-2xl" />

                    <div className="relative flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <CreditCard className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-700">
                            Paiement en ligne (Chargily)
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                            <Clock className="h-3 w-3" />
                            Coming soon
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Le paiement en ligne arrive bientôt. Utilisez pour
                          l&apos;instant le paiement en main propre.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleHandToHand}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 shadow-md shadow-blue-600/20"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <HandCoins className="w-5 h-5" />
                    )}
                    Paiement en main propre
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <RegistrationPendingModal
        open={showPendingModal}
        title="Demande enregistrée !"
        documentLabel={documentLabel}
        selectedPlanName={pendingPlanName}
      />
    </div>
  );
}
