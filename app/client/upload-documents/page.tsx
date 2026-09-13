"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, AlertCircle, ArrowLeft, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getApiUrl, parseResponseJson } from "@/lib/api-config";
import { validatePdfFile } from "@/lib/file-validation";
import { validateOnboardingRedirect } from "@/lib/security";

/** New PDF only — no existing-document section (avoids stale upload + hydration issues). */
export default function ClientUploadDocumentsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) {
      clearFile();
      return;
    }
    const validation = await validatePdfFile(selected);
    if (!validation.valid) {
      setError(validation.error || "Fichier invalide");
      clearFile();
      return;
    }
    setFile(selected);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Veuillez télécharger votre pièce d'identité");
      return;
    }
    const validation = await validatePdfFile(file);
    if (!validation.valid) {
      setError(validation.error || "Fichier PDF invalide");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("identity", file);
      const response = await apiFetch(`${getApiUrl()}/client/documents`, {
        method: "POST",
        body: formData,
      });
      const result = await parseResponseJson<{
        success: boolean;
        message?: string;
        data?: { redirectTo?: string };
      }>(response);

      if (response.status === 401 || response.status === 403) {
        setError(result.message || "Session expirée. Veuillez vous reconnecter.");
        return;
      }
      if (!response.ok || !result.success) {
        setError(result.message || "Une erreur est survenue lors de l'upload");
        return;
      }

      clearFile();
      router.replace(
        validateOnboardingRedirect(result.data?.redirectTo) ||
          "/client/choose-subscription"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Télécharger votre pièce d&apos;identité
          </h1>
          <p className="text-gray-600">
            Étape 2/3 — Après l&apos;envoi, choisissez votre plan d&apos;abonnement.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200">
          {error ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6" autoComplete="off">
            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
                Pièce d&apos;identité (PDF)
              </p>

              <div
                className={
                  file
                    ? "flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl"
                    : "flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                }
              >
                {file ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Retirer le fichier"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer px-4">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 text-center">
                      <span className="font-semibold">Cliquez pour télécharger</span>{" "}
                      ou glissez-déposez
                    </p>
                    <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={onFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !file}
              className="w-full py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Téléchargement en cours..."
                : "Continuer vers le choix d'abonnement"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
