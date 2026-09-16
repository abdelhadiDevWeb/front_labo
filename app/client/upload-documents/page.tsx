"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  FileText,
  AlertCircle,
  ArrowLeft,
  X,
  Loader2,
  CheckCircle,
  Info,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getApiUrl, parseResponseJson } from "@/lib/api-config";
import { validatePdfFile } from "@/lib/file-validation";
import { validateOnboardingRedirect } from "@/lib/security";
import { useOnboardingBackGuard } from "@/components/OnboardingBackGuard";

function ClientUploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const choosePlanHref = "/client/choose-subscription";

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDocs, setIsCheckingDocs] = useState(true);
  const [hasExistingDocs, setHasExistingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { openModal, modal } = useOnboardingBackGuard("/", !isEditMode && !hasExistingDocs);

  useEffect(() => {
    let cancelled = false;
    const loadDocs = async () => {
      setIsCheckingDocs(true);
      try {
        const response = await apiFetch(`${getApiUrl()}/client/documents`, {
          method: "GET",
          cache: "no-store",
        });
        const result = await parseResponseJson<{
          success: boolean;
          data?: { hasDocuments?: boolean; identity?: boolean };
        }>(response);
        if (!cancelled && result.success && result.data?.hasDocuments) {
          setHasExistingDocs(true);
        }
      } catch {
        // ignore — treat as no existing docs
      } finally {
        if (!cancelled) setIsCheckingDocs(false);
      }
    };
    void loadDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCheckingDocs && hasExistingDocs && !isEditMode) {
      router.replace(choosePlanHref);
    }
  }, [isCheckingDocs, hasExistingDocs, isEditMode, router, choosePlanHref]);

  useEffect(() => {
    if (isEditMode || hasExistingDocs) return;
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [isEditMode, hasExistingDocs]);

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

  const goToChoosePlan = () => {
    router.replace(choosePlanHref);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      if (hasExistingDocs) {
        goToChoosePlan();
        return;
      }
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
      formData.append("identity", file, file.name);

      const response = await apiFetch(`${getApiUrl()}/client/documents`, {
        method: "POST",
        body: formData,
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const result = await parseResponseJson<{
        success: boolean;
        message?: string;
        data?: { redirectTo?: string; identity?: string };
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
        validateOnboardingRedirect(result.data?.redirectTo) || choosePlanHref
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

  const handleBack = () => {
    if (isEditMode || hasExistingDocs) {
      goToChoosePlan();
      return;
    }
    openModal();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      {modal}
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>{isEditMode || hasExistingDocs ? "Retour au choix du plan" : "Retour"}</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {hasExistingDocs
              ? "Vos documents"
              : "Télécharger votre pièce d'identité"}
          </h1>
          <p className="text-gray-600">
            Étape 2/3 —{" "}
            {hasExistingDocs
              ? "Vous pouvez conserver vos documents ou les remplacer."
              : "Envoyez un nouveau PDF."}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200">
          {isCheckingDocs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {hasExistingDocs && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 space-y-1">
                    <p className="font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Vous avez déjà téléchargé vos documents
                    </p>
                    <p>
                      Pièce d&apos;identité : déjà envoyée. Pour la modifier, choisissez un
                      nouveau PDF ci-dessous. Sinon, continuez vers le choix du plan.
                    </p>
                  </div>
                </div>
              )}

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
                    {hasExistingDocs ? " — remplacer (optionnel)" : ""}
                  </p>

                  {file ? (
                    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB — nouveau fichier
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
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors px-4">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 text-center">
                        <span className="font-semibold">
                          {hasExistingDocs
                            ? "Cliquez pour remplacer"
                            : "Cliquez pour télécharger"}
                        </span>{" "}
                        ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
                      <input
                        ref={inputRef}
                        type="file"
                        name="identity-new"
                        accept="application/pdf,.pdf"
                        className="sr-only"
                        onChange={onFileChange}
                      />
                    </label>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {hasExistingDocs && !file && (
                    <button
                      type="button"
                      onClick={goToChoosePlan}
                      className="flex-1 py-3 px-4 rounded-xl text-sm font-medium border-2 border-blue-200 text-blue-700 bg-white hover:bg-blue-50"
                    >
                      Continuer sans modifier
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || (!file && !hasExistingDocs)}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? "Téléchargement en cours..."
                      : file
                        ? hasExistingDocs
                          ? "Enregistrer et continuer"
                          : "Continuer vers le choix d'abonnement"
                        : "Continuer vers le choix d'abonnement"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientUploadDocumentsKeyed() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const remountKey = `${pathname}?${searchParams.toString()}`;
  return <ClientUploadForm key={remountKey} />;
}

export default function ClientUploadDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <ClientUploadDocumentsKeyed />
    </Suspense>
  );
}
