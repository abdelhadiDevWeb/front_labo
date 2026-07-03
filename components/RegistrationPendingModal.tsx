"use client";

import { performLogout } from "@/lib/perform-logout";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Home, LogOut } from "lucide-react";

interface RegistrationPendingModalProps {
  open: boolean;
  title?: string;
  documentLabel?: string;
  selectedPlanName?: string;
  onClose?: () => void;
}

export default function RegistrationPendingModal({
  open,
  title = "Inscription enregistrée !",
  documentLabel = "documents",
  selectedPlanName,
  onClose,
}: RegistrationPendingModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fade-in-up border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
            </div>
          </div>

          <div className="p-6">
            <p className="text-gray-700 mb-2 leading-relaxed">
              Vos {documentLabel} ont été enregistrés avec succès.
            </p>
            {selectedPlanName && (
              <p className="text-gray-700 mb-2 leading-relaxed">
                Plan choisi : <strong>{selectedPlanName}</strong> — paiement en main propre.
              </p>
            )}
            <p className="text-gray-700 mb-6 leading-relaxed">
              Vous devez maintenant attendre la dernière étape :{" "}
              <strong>la confirmation de votre compte et le règlement de votre abonnement par l&apos;administrateur</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Vous recevrez une notification une fois que votre compte sera approuvé.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  void performLogout(router, { redirectTo: "/home" });
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Home className="w-5 h-5" />
                <span>Retour à l&apos;accueil</span>
              </button>
              <button
                onClick={() => {
                  void performLogout(router);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
