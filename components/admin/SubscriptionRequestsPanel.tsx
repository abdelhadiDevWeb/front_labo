"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  Eye,
  HandCoins,
  Inbox,
  Landmark,
  Loader2,
  Phone,
  TrendingUp,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import {
  apiFetch,
  approveSubscriptionRequest,
  getSubscriptionRequests,
  rejectSubscriptionRequest,
  type AdminSubscriptionRequest,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { formatPlanDuration } from "@/components/subscription/PlanFeatures";

interface SubscriptionRequestsPanelProps {
  /** Called after an approval/rejection so the page can reload users & subscriptions. */
  onChanged: () => void | Promise<void>;
}

type Tab = "pending" | "processed";

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function SubscriptionRequestsPanel({ onChanged }: SubscriptionRequestsPanelProps) {
  const [tab, setTab] = useState<Tab>("pending");
  const [requests, setRequests] = useState<AdminSubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<AdminSubscriptionRequest | null>(null);
  const [rejecting, setRejecting] = useState<AdminSubscriptionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<{ url: string; isImage: boolean } | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      const result = await getSubscriptionRequests(tab);
      if (result.success && result.data) {
        setRequests(result.data.requests);
        if (!silent) setError(null);
      } else if (!silent) {
        setError(result.message || "Impossible de charger les demandes");
      }
      if (!silent) setIsLoading(false);
    },
    [tab]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => void load(true);
    window.addEventListener("pendingUsersUpdated", refresh);
    return () => window.removeEventListener("pendingUsersUpdated", refresh);
  }, [load]);

  useEffect(() => {
    return () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview.url);
    };
  }, [receiptPreview]);

  const openReceipt = async (request: AdminSubscriptionRequest) => {
    if (!request.receipt) return;
    const url = getMediaUrl(request.receipt);
    if (!url) {
      setError("Reçu introuvable");
      return;
    }
    try {
      const response = await apiFetch(url, { method: "GET" });
      if (!response.ok) {
        setError("Impossible d'ouvrir le reçu");
        return;
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const isImage = blob.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(request.receipt);
      if (isImage) {
        setReceiptPreview({ url: objectUrl, isImage: true });
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch {
      setError("Impossible d'ouvrir le reçu");
    }
  };

  const approve = async (request: AdminSubscriptionRequest) => {
    setBusyId(request.id);
    setError(null);
    const result = await approveSubscriptionRequest(request.id);
    setBusyId(null);
    setConfirmApprove(null);
    if (result.success) {
      setNotice(result.message || "Demande validée");
      setTimeout(() => setNotice(null), 4000);
      await load(true);
      await onChanged();
    } else {
      setError(result.message || "Validation impossible");
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setError(null);
    const result = await rejectSubscriptionRequest(rejecting.id, rejectReason.trim());
    setBusyId(null);
    setRejecting(null);
    setRejectReason("");
    if (result.success) {
      setNotice("Demande refusée — l'utilisateur a été notifié");
      setTimeout(() => setNotice(null), 4000);
      await load(true);
      await onChanged();
    } else {
      setError(result.message || "Refus impossible");
    }
  };

  const renderQuotaLine = (request: AdminSubscriptionRequest) => {
    const quota = request.listingQuota;
    if (!request.is_upgrade || !quota) return null;
    const newRemaining =
      request.projectedMax !== null ? Math.max(0, request.projectedMax - quota.used) : null;
    return (
      <div className="mt-3 rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-xs text-purple-900 space-y-1">
        <p>
          Plan actuel : <strong>« {request.previousSubscription?.type ?? quota.subscriptionType ?? "—"} »</strong>{" "}
          — {quota.used} / {quota.max ?? "∞"} annonces
          {quota.remaining !== null && ` (reste ${quota.remaining})`}
        </p>
        {request.status === "pending" && (
          <p>
            Après validation :{" "}
            {request.projectedMax === null ? (
              <strong>annonces illimitées</strong>
            ) : (
              <>
                max <strong>{request.projectedMax}</strong> — pourra ajouter{" "}
                <strong>{newRemaining}</strong> annonce(s)
              </>
            )}
          </p>
        )}
      </div>
    );
  };

  const modalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Demandes d&apos;abonnement</h3>
          <p className="text-sm text-gray-500 mt-1">
            Paiements en main propre et reçus CCP / BaridiMob (inscriptions et mises à niveau)
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
          {(["pending", "processed"] as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                tab === value ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {value === "pending" ? "En attente" : "Traitées"}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Inbox className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">
            {tab === "pending" ? "Aucune demande en attente" : "Aucune demande traitée"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {requests.map((request) => {
            const userName = request.user
              ? `${request.user.firstName} ${request.user.lastName}`.trim() || request.user.email
              : "Utilisateur supprimé";
            const isBusy = busyId === request.id;
            return (
              <div key={request.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{userName}</h4>
                    {request.user && (
                      <>
                        <p className="text-sm text-gray-500 truncate">{request.user.email}</p>
                        {request.user.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {request.user.phone}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {request.is_upgrade ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-purple-100 text-purple-700">
                        <TrendingUp className="w-3 h-3" />
                        Mise à niveau
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-blue-100 text-blue-700">
                        <UserPlus className="w-3 h-3" />
                        Inscription
                      </span>
                    )}
                    {request.payment_method === "ccp_baridi" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">
                        <Landmark className="w-3 h-3" />
                        Reçu CCP / BaridiMob
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                        <HandCoins className="w-3 h-3" />
                        Main propre
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-700 space-y-1">
                  <p>
                    Plan demandé : <strong>« {request.typeName} »</strong> —{" "}
                    {request.price.toLocaleString("fr-DZ")} DZD — {formatPlanDuration(request.typeTime)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Annonces incluses : {request.max_products ?? "non défini"} — demandée le{" "}
                    {formatDate(request.createdAt)}
                  </p>
                </div>

                {renderQuotaLine(request)}

                {request.status !== "pending" && (
                  <div
                    className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                      request.status === "approved"
                        ? "bg-green-50 text-green-800 border border-green-100"
                        : "bg-red-50 text-red-800 border border-red-100"
                    }`}
                  >
                    {request.status === "approved" ? "Validée" : "Refusée"}
                    {request.reviewed_at && ` le ${formatDate(request.reviewed_at)}`}
                    {request.reject_reason && ` — ${request.reject_reason}`}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {request.receipt && (
                    <button
                      type="button"
                      onClick={() => void openReceipt(request)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      Voir le reçu
                    </button>
                  )}
                  {request.status === "pending" && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmApprove(request)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Valider
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setRejecting(request);
                          setRejectReason("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalRoot &&
        confirmApprove &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => !busyId && setConfirmApprove(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Valider la demande ?</h3>
              <p className="text-sm text-gray-600 mb-6">
                {confirmApprove.is_upgrade
                  ? `L'abonnement actuel sera arrêté et le plan « ${confirmApprove.typeName} » démarrera aujourd'hui.`
                  : `Le plan « ${confirmApprove.typeName} » sera activé aujourd'hui.`}{" "}
                Vérifiez que le paiement a bien été reçu.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmApprove(null)}
                  disabled={!!busyId}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void approve(confirmApprove)}
                  disabled={!!busyId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {busyId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Valider
                </button>
              </div>
            </div>
          </div>,
          modalRoot
        )}

      {modalRoot &&
        rejecting &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => !busyId && setRejecting(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Refuser la demande ?</h3>
              <p className="text-sm text-gray-600 mb-4">
                L&apos;utilisateur recevra une notification avec le motif.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Motif (optionnel), ex : reçu illisible, montant incorrect..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(null)}
                  disabled={!!busyId}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void reject()}
                  disabled={!!busyId}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {busyId ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Refuser
                </button>
              </div>
            </div>
          </div>,
          modalRoot
        )}

      {modalRoot &&
        receiptPreview &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80" onClick={() => setReceiptPreview(null)} />
            <div className="relative max-w-3xl w-full">
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptPreview.url}
                alt="Reçu de paiement"
                className="w-full max-h-[85vh] object-contain rounded-xl bg-white"
              />
            </div>
          </div>,
          modalRoot
        )}
    </div>
  );
}
