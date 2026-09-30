"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowUpCircle, Clock } from "lucide-react";
import {
  getMyListingQuota,
  getMySubscriptionRequest,
  type ListingQuota,
  type SubscriptionRequest,
} from "@/lib/api";
import UpgradePlanModal from "@/components/supplier/UpgradePlanModal";

/** Red warning appears when this many listings (or fewer) remain on the running subscription. */
const WARNING_THRESHOLD = 20;
const SUPERSEDED_REASON = "Remplacée par une nouvelle demande";

export const LISTING_QUOTA_CHANGED_EVENT = "ml:listing-quota-changed";
export const SUBSCRIPTION_REQUEST_UPDATED_EVENT = "ml:subscription-request-updated";

export default function ListingQuotaHeaderAlert() {
  const [quota, setQuota] = useState<ListingQuota | null>(null);
  const [request, setRequest] = useState<SubscriptionRequest | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const load = useCallback(async () => {
    const [quotaResult, requestResult] = await Promise.all([
      getMyListingQuota(),
      getMySubscriptionRequest(),
    ]);
    if (quotaResult.success && quotaResult.data) setQuota(quotaResult.data.quota);
    if (requestResult.success && requestResult.data) setRequest(requestResult.data.request);
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener(LISTING_QUOTA_CHANGED_EVENT, refresh);
    window.addEventListener(SUBSCRIPTION_REQUEST_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(LISTING_QUOTA_CHANGED_EVENT, refresh);
      window.removeEventListener(SUBSCRIPTION_REQUEST_UPDATED_EVENT, refresh);
    };
  }, [load]);

  const isLow =
    quota !== null &&
    quota.hasActiveSubscription &&
    quota.max !== null &&
    quota.remaining !== null &&
    quota.remaining <= WARNING_THRESHOLD;

  if (!quota || !isLow) return null;

  const remaining = quota.remaining ?? 0;
  const upgradeRequest = request?.is_upgrade ? request : null;
  const pendingUpgrade = upgradeRequest?.status === "pending" ? upgradeRequest : null;
  const rejectedUpgrade =
    upgradeRequest?.status === "rejected" && upgradeRequest.reject_reason !== SUPERSEDED_REASON
      ? upgradeRequest
      : null;

  return (
    <>
      <div
        role="alert"
        className="relative overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white border-t-2 border-red-800"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #000 0, #000 12px, transparent 12px, transparent 24px)",
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/30" />
              <AlertTriangle className="relative w-5 h-5 text-yellow-300" />
            </span>
            <div className="min-w-0">
              <p className="font-extrabold uppercase tracking-wide text-sm sm:text-base">
                {remaining <= 0
                  ? "Limite d'annonces atteinte !"
                  : `Attention : il ne vous reste que ${remaining} annonce${remaining > 1 ? "s" : ""}`}
              </p>
              <p className="text-xs sm:text-sm text-red-100">
                {quota.used} / {quota.max} annonces utilisées (produits, machines et services) —
                abonnement « {quota.subscriptionType} »
                {rejectedUpgrade && (
                  <span className="block text-yellow-200">
                    Votre demande de mise à niveau vers « {rejectedUpgrade.typeName} » a été refusée
                    {rejectedUpgrade.reject_reason ? ` : ${rejectedUpgrade.reject_reason}` : "."}
                  </span>
                )}
              </p>
            </div>
          </div>

          {pendingUpgrade ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">
                <Clock className="w-4 h-4" />
                Demande « {pendingUpgrade.typeName} » en attente de validation
              </span>
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="text-xs font-semibold underline underline-offset-2 hover:text-red-100"
              >
                Modifier
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-lg shadow-red-900/30 hover:bg-red-50 transition-colors"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Mettre à niveau votre plan
            </button>
          )}
        </div>
      </div>

      <UpgradePlanModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        quota={quota}
        onSubmitted={(submitted) => setRequest(submitted)}
      />
    </>
  );
}
