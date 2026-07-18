"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, X } from "lucide-react";

/**
 * Blocks browser Back during onboarding (upload step).
 * Shows a modal: cannot go back → option to stay or go to home.
 */
export function useOnboardingBackGuard(
  homeHref: string = "/",
  enabled: boolean = true
) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!enabled) return;

    window.history.pushState({ onboardingGuard: true }, "", window.location.href);

    const onPopState = () => {
      window.history.pushState({ onboardingGuard: true }, "", window.location.href);
      setShowModal(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled]);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal]);

  const openModal = useCallback(() => setShowModal(true), []);
  const stayHere = useCallback(() => setShowModal(false), []);
  const goHome = useCallback(() => {
    setShowModal(false);
    router.replace(homeHref);
  }, [router, homeHref]);

  const modal =
    mounted && showModal
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={stayHere}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-back-title"
              className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                  </div>
                  <h2
                    id="onboarding-back-title"
                    className="text-xl font-bold text-gray-900"
                  >
                    Retour impossible
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={stayHere}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Vous ne pouvez pas revenir en arrière. Votre inscription est déjà
                  enregistrée — continuez le téléchargement de vos documents pour
                  finaliser votre compte.
                </p>
                <p className="text-sm text-gray-500">
                  Si vous souhaitez quitter cette étape, vous pouvez aller à
                  l&apos;accueil.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={stayHere}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Rester ici
                  </button>
                  <button
                    type="button"
                    onClick={goHome}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Home className="w-5 h-5" />
                    Aller à l&apos;accueil
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { openModal, modal };
}
