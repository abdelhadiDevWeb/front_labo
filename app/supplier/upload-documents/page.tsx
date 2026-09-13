"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  X,
  Loader2,
  Info,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getApiUrl, parseResponseJson } from "@/lib/api-config";
import { validatePdfFile } from "@/lib/file-validation";
import { validateOnboardingRedirect } from "@/lib/security";
import { useOnboardingBackGuard } from "@/components/OnboardingBackGuard";

type DocField = "Tax_number" | "identity" | "commercial_register";

type ExistingDocs = {
  hasDocuments: boolean;
  Tax_number: boolean;
  identity: boolean;
  commercial_register: boolean;
};

function SupplierUploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const choosePlanHref = "/supplier/choose-subscription";

  const [files, setFiles] = useState<Record<DocField, File | null>>({
    Tax_number: null,
    identity: null,
    commercial_register: null,
  });
  const [existing, setExisting] = useState<ExistingDocs | null>(null);
  const [isCheckingDocs, setIsCheckingDocs] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasExistingDocs = Boolean(existing?.hasDocuments);
  const { openModal, modal } = useOnboardingBackGuard("/", !isEditMode && !hasExistingDocs);

  useEffect(() => {
    let cancelled = false;
    const loadDocs = async () => {
      setIsCheckingDocs(true);
      try {
        const response = await apiFetch(`${getApiUrl()}/supplier/documents`, {
          method: "GET",
          cache: "no-store",
        });
        const result = await parseResponseJson<{
          success: boolean;
          data?: ExistingDocs;
        }>(response);
        if (!cancelled && result.success && result.data) {
          setExisting(result.data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsCheckingDocs(false);
      }
    };
    void loadDocs();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = async (field: DocField, file: File | null) => {
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

  const handleRemoveFile = (field: DocField) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
  };

  const goToChoosePlan = () => {
    router.replace(choosePlanHref);
  };

  const handleBack = () => {
    if (isEditMode || hasExistingDocs) {
      goToChoosePlan();
      return;
    }
    openModal();
  };

  const hasAnyNewFile = Boolean(
    files.Tax_number || files.identity || files.commercial_register
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (hasExistingDocs && !hasAnyNewFile) {
      goToChoosePlan();
      return;
    }

    if (!hasExistingDocs) {
      if (!files.Tax_number || !files.identity || !files.commercial_register) {
        setError(
          "Veuillez télécharger les trois documents requis : Numéro de Taxe, Pièce d'identité et Registre du Commerce"
        );
        return;
      }
    }

    const toValidate = [
      files.Tax_number,
      files.identity,
      files.commercial_register,
    ].filter(Boolean) as File[];

    for (const file of toValidate) {
      const validation = await validatePdfFile(file);
      if (!validation.valid) {
        setError(validation.error || "Fichier PDF invalide");
        return;
      }
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      if (files.Tax_number) formData.append("Tax_number", files.Tax_number);
      if (files.identity) formData.append("identity", files.identity);
      if (files.commercial_register) {
        formData.append("commercial_register", files.commercial_register);
      }

      const response = await apiFetch(`${getApiUrl()}/supplier/documents`, {
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

      router.replace(
        validateOnboardingRedirect(result.data?.redirectTo) || choosePlanHref
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue. Veuillez réessayer."
      );
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: DocField, label: string) => {
    const selected = files[field];
    const alreadyUploaded = Boolean(existing?.[field]);

    return (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {hasExistingDocs && alreadyUploaded ? (
            <span className="ml-2 text-xs font-normal text-green-700">
              (déjà téléchargé)
            </span>
          ) : null}
        </label>
        <div className="mt-1">
          {selected ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selected.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(selected.size / 1024).toFixed(2)} KB — nouveau fichier
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(field)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : alreadyUploaded && hasExistingDocs ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Document déjà enregistré
                  </p>
                  <p className="text-xs text-green-700">
                    Conservé tel quel — remplacez uniquement si besoin
                  </p>
                </div>
              </div>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <Upload className="w-6 h-6 mb-1 text-gray-400" />
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Remplacer ce PDF</span>
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={(e) =>
                    void handleFileChange(field, e.target.files?.[0] || null)
                  }
                />
              </label>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Cliquez pour télécharger</span> ou
                  glissez-déposez
                </p>
                <p className="text-xs text-gray-500">PDF uniquement (MAX. 5MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={(e) =>
                  void handleFileChange(field, e.target.files?.[0] || null)
                }
              />
            </label>
          )}
        </div>
      </div>
    );
  };

  const canSubmitFirstTime =
    Boolean(files.Tax_number) &&
    Boolean(files.identity) &&
    Boolean(files.commercial_register);

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
            <span>
              {isEditMode || hasExistingDocs ? "Retour au choix du plan" : "Retour"}
            </span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {hasExistingDocs ? "Vos documents" : "Télécharger vos documents"}
          </h1>
          <p className="text-gray-600">
            Étape 2/3 —{" "}
            {hasExistingDocs
              ? "Vous pouvez conserver vos documents ou en remplacer certains."
              : "Après l'envoi, vous choisirez votre plan d'abonnement."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
              1. Inscription
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-medium">
              2. Documents
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              3. Choisir un plan
            </span>
          </div>
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
                      Remplacez uniquement les fichiers que vous souhaitez changer,
                      ou continuez vers le choix du plan sans modification.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {renderField("Tax_number", "Numéro de Taxe (PDF)")}
                {renderField("identity", "Pièce d'identité (PDF)")}
                {renderField("commercial_register", "Registre du Commerce (PDF)")}

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  {hasExistingDocs && !hasAnyNewFile && (
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
                    disabled={
                      isLoading ||
                      (!hasExistingDocs && !canSubmitFirstTime) ||
                      (hasExistingDocs && !hasAnyNewFile)
                    }
                    className="flex-1 flex justify-center py-3 px-4 rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? "Téléchargement en cours..."
                      : hasExistingDocs && hasAnyNewFile
                        ? "Enregistrer et continuer"
                        : "Continuer vers le choix d'abonnement"}
                  </button>
                </div>
                {!hasExistingDocs &&
                  (!files.Tax_number ||
                    !files.identity ||
                    !files.commercial_register) && (
                    <p className="text-sm text-gray-500 text-center">
                      Tous les trois documents sont requis pour les fournisseurs
                    </p>
                  )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UploadDocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }
    >
      <SupplierUploadForm />
    </Suspense>
  );
}
