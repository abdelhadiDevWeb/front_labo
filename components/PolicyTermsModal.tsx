"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Loader2, RefreshCw, ScrollText, X } from "lucide-react";
import { getPublicPolicies, type Policy, type PolicyType } from "@/lib/api";

interface PolicyTermsModalProps {
  open: boolean;
  type: PolicyType;
  onAccept: () => void;
  onClose: () => void;
}

export default function PolicyTermsModal({ open, type, onAccept, onClose }: PolicyTermsModalProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedFor, setFetchedFor] = useState<PolicyType | null>(null);

  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPublicPolicies(type);
      if (result?.success && result.data) {
        setPolicies(result.data.policies ?? []);
      } else {
        console.error("[PolicyTermsModal] chargement échoué", result);
        setError(result?.message || "Impossible de charger les conditions générales (réponse inattendue du serveur)");
      }
    } catch (err) {
      console.error("[PolicyTermsModal] chargement échoué", err);
      const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
      setError(`Impossible de charger les conditions générales${detail}`);
    } finally {
      setIsLoading(false);
      setFetchedFor(type);
    }
  }, [type]);

  useEffect(() => {
    if (!open) {
      setFetchedFor(null);
      return;
    }
    setPolicies([]);
    void loadPolicies();
  }, [open, loadPolicies]);

  const loadedEmpty =
    open && !isLoading && fetchedFor === type && !error && policies.length === 0;

  useEffect(() => {
    if (loadedEmpty) onAccept();
  }, [loadedEmpty, onAccept]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const audience = type === "supplier" ? "fournisseurs" : "laboratoires";
  const pending = isLoading || fetchedFor !== type || loadedEmpty;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-terms-title"
        className="bg-white w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-4 sm:p-6 flex items-center justify-between gap-3 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 id="policy-terms-title" className="text-lg sm:text-xl font-bold text-white">
                Conditions générales
              </h2>
              <p className="text-xs sm:text-sm text-white/80">Pour les {audience}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          {pending ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-10 gap-4">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-sm text-gray-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadPolicies()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
            </div>
          ) : policies.length > 0 ? (
            <div className="space-y-6">
              {policies.map((policy) => (
                <section key={policy.id}>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{policy.title}</h3>
                  <p className="mt-2 text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line break-words">
                    {policy.text}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-10">
              Aucune condition générale n&apos;est disponible pour le moment.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 px-4 pt-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6 flex flex-col-reverse sm:flex-row gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="sm:flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={pending || !!error}
            className="sm:flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Accepter
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
