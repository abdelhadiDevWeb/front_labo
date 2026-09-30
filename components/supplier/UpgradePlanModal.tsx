"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  getPublicSubscriptionPlans,
  requestSubscriptionUpgrade,
  type ListingQuota,
  type SubscriptionRequest,
  type SubscriptionType,
} from "@/lib/api";
import PaymentMethodPicker from "@/components/subscription/PaymentMethodPicker";
import {
  PlanMaxProductsInfo,
  PlanSponsorInfo,
  formatPlanDuration,
} from "@/components/subscription/PlanFeatures";

interface UpgradePlanModalProps {
  open: boolean;
  onClose: () => void;
  quota: ListingQuota;
  onSubmitted: (request: SubscriptionRequest) => void;
}

/** Listings the supplier will be able to add once the upgrade is approved. */
const listingsAfterUpgrade = (plan: SubscriptionType, quota: ListingQuota): number | null =>
  plan.max_products == null ? null : plan.max_products + (quota.remaining ?? 0);

export default function UpgradePlanModal({ open, onClose, quota, onSubmitted }: UpgradePlanModalProps) {
  const [plans, setPlans] = useState<SubscriptionType[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedPlanName, setSubmittedPlanName] = useState<string | null>(null);

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
    if (!open) return;
    setSelectedPlan(null);
    setError(null);
    setSubmittedPlanName(null);
    void loadPlans();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open, loadPlans]);

  const submit = async (method: "hand_to_hand" | "ccp_baridi", receipt?: File) => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    setError(null);
    const result = await requestSubscriptionUpgrade(selectedPlan.id, method, receipt);
    setIsProcessing(false);
    if (result.success && result.data?.request) {
      setSubmittedPlanName(selectedPlan.name);
      onSubmitted(result.data.request);
    } else {
      setError(result.message || "Une erreur est survenue");
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={isProcessing ? undefined : onClose} />
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-200 bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mettre à niveau votre plan</h2>
              <p className="text-sm text-gray-500">
                Abonnement actuel : « {quota.subscriptionType} » — {quota.used} / {quota.max ?? "∞"} annonces
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {submittedPlanName ? (
            <div className="max-w-md mx-auto text-center py-10">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Demande envoyée !</h3>
              <p className="text-gray-600 mb-6">
                Votre demande de passage au plan « {submittedPlanName} » a été transmise à
                l&apos;administrateur. Vous recevrez une notification dès qu&apos;elle sera validée.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700"
              >
                Fermer
              </button>
            </div>
          ) : !selectedPlan ? (
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
                {plans.map((plan) => {
                  const isCurrent = plan.name === quota.subscriptionType;
                  const after = listingsAfterUpgrade(plan, quota);
                  return (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all p-6 flex flex-col ${
                        isCurrent ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                        {isCurrent && (
                          <span className="ml-auto text-[11px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                            Plan actuel
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-gray-600 text-sm mb-4 flex-1">{plan.description}</p>
                      )}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-gray-700 text-sm">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Durée de l&apos;abonnement&nbsp;: {formatPlanDuration(plan.time)}</span>
                        </div>
                        <PlanMaxProductsInfo plan={plan} role="supplier" />
                        <PlanSponsorInfo plan={plan} />
                      </div>
                      <div className="mb-4 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                        {after === null
                          ? "Après validation : annonces illimitées"
                          : `Après validation : vous pourrez ajouter ${after} annonce(s)`}
                      </div>
                      <div className="mt-auto">
                        <p className="text-3xl font-bold text-blue-600 mb-4">
                          {plan.price.toLocaleString("fr-DZ")} <span className="text-lg font-medium">DZD</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setError(null);
                          }}
                          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all"
                        >
                          Choisir ce plan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="max-w-lg mx-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlan(null);
                  setError(null);
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Choisir un autre plan
              </button>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8">
                <div className="text-center mb-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedPlan.name}</h3>
                  <p className="text-3xl font-bold text-blue-600 mt-2">
                    {selectedPlan.price.toLocaleString("fr-DZ")} DZD
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    Durée de l&apos;abonnement&nbsp;: {formatPlanDuration(selectedPlan.time)}
                  </p>
                  <div className="mt-4 text-left max-w-sm mx-auto space-y-2">
                    <PlanMaxProductsInfo plan={selectedPlan} role="supplier" />
                    <PlanSponsorInfo plan={selectedPlan} />
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    Votre abonnement actuel sera remplacé dès la validation par l&apos;administrateur.
                  </p>
                </div>

                <p className="text-gray-700 text-center mb-6">
                  Comment souhaitez-vous régler votre abonnement ?
                </p>

                <PaymentMethodPicker
                  isProcessing={isProcessing}
                  onHandToHand={() => void submit("hand_to_hand")}
                  onCcpSubmit={(receipt) => void submit("ccp_baridi", receipt)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
