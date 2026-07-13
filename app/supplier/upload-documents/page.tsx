"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft, X } from "lucide-react";
import { apiFetch, checkAuthSession } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { validatePdfFile } from "@/lib/file-validation";
import { validateOnboardingRedirect } from "@/lib/security";

export default function UploadDocumentsPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard();
  const [files, setFiles] = useState({
    Tax_number: null as File | null,
    identity: null as File | null,
    commercial_register: null as File | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = async (field: keyof typeof files, file: File | null) => {
    if (!file) {
      setFiles((prev) => ({ ...prev, [field]: null }));
      return;
    }
    const validation = await validatePdfFile(file);
    if (!validation.valid) {
      setError(validation.error || "Fichier invalide");
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
    setError(null);
  };

  const handleRemoveFile = (field: keyof typeof files) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Security: Validate all files are selected (suppliers must upload all 3)
    if (!files.Tax_number || !files.identity || !files.commercial_register) {
      setError("Veuillez télécharger les trois documents requis : Numéro de Taxe, Pièce d'identité et Registre du Commerce");
      return;
    }

    const allFiles = [files.Tax_number, files.identity, files.commercial_register];
    for (const file of allFiles) {
      const validation = await validatePdfFile(file);
      if (!validation.valid) {
        setError(validation.error || "Fichier PDF invalide");
        return;
      }
    }

    setIsLoading(true);

    try {
      const authed = await checkAuthSession();
      if (!authed) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = getApiUrl();

      const formData = new FormData();
      formData.append("Tax_number", files.Tax_number);
      formData.append("identity", files.identity);
      formData.append("commercial_register", files.commercial_register);

      const response = await apiFetch(`${API_BASE_URL}/supplier/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Une erreur est survenue lors de l'upload");
        setIsLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        const next =
          validateOnboardingRedirect(result.data?.redirectTo) ||
          "/supplier/choose-subscription";
        router.push(next);
      } else {
        setError(result.message || "Une erreur est survenue");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Vérification de la session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Télécharger vos documents
          </h1>
          <p className="text-gray-600">
            Étape 2/3 — Après l&apos;envoi, vous choisirez votre plan d&apos;abonnement,
            puis votre demande sera envoyée à l&apos;administrateur.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">1. Inscription</span>
            <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-medium">2. Documents</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">3. Choisir un plan</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-fade-in">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tax Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de Taxe (PDF)
              </label>
              <div className="mt-1">
                {files.Tax_number ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{files.Tax_number.name}</p>
                        <p className="text-xs text-gray-500">
                          {(files.Tax_number.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("Tax_number")}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange={(e) => handleFileChange("Tax_number", e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pièce d'identité (PDF)
              </label>
              <div className="mt-1">
                {files.identity ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{files.identity.name}</p>
                        <p className="text-xs text-gray-500">
                          {(files.identity.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("identity")}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange={(e) => handleFileChange("identity", e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Commercial Register */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registre du Commerce (PDF)
              </label>
              <div className="mt-1">
                {files.commercial_register ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{files.commercial_register.name}</p>
                        <p className="text-xs text-gray-500">
                          {(files.commercial_register.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("commercial_register")}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange={(e) =>
                        handleFileChange("commercial_register", e.target.files?.[0] || null)
                      }
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  isLoading || 
                  !files.Tax_number || 
                  !files.identity || 
                  !files.commercial_register ||
                  (files.Tax_number && files.Tax_number.type !== "application/pdf") ||
                  (files.identity && files.identity.type !== "application/pdf") ||
                  (files.commercial_register && files.commercial_register.type !== "application/pdf")
                }
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 hover-lift hover-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading
                  ? "Téléchargement en cours..."
                  : "Continuer vers le choix d'abonnement"}
              </button>
              {(!files.Tax_number || !files.identity || !files.commercial_register) && (
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Tous les trois documents sont requis pour les fournisseurs
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

