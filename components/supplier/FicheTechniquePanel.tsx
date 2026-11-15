"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, Loader2, Upload, X } from "lucide-react";

type FicheTechniquePanelProps = {
  /** Same-origin `/api/files/...` URL, or null when empty */
  pdfUrl: string | null;
  title?: string;
  onUpload: (file: File) => Promise<{ success: boolean; message?: string }>;
  className?: string;
};

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export default function FicheTechniquePanel({
  pdfUrl,
  title = "Fiche technique",
  onUpload,
  className = "",
}: FicheTechniquePanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPdf, setShowPdf] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPdf = Boolean(pdfUrl);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showPdf) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPdf(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [showPdf]);

  const resetFileInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(null);
    const file = e.target.files?.[0] || null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setSelectedFile(null);
      resetFileInput();
      setError("Seuls les fichiers PDF sont acceptés");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setSelectedFile(null);
      resetFileInput();
      setError("Le PDF ne doit pas dépasser 20 Mo");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await onUpload(selectedFile);
      if (result.success) {
        setSuccess(
          hasPdf ? "Fiche technique mise à jour" : "Fiche technique ajoutée"
        );
        setSelectedFile(null);
        resetFileInput();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Échec de l'envoi du PDF");
      }
    } catch {
      setError("Une erreur est survenue lors de l'envoi");
    } finally {
      setIsUploading(false);
    }
  };

  const pdfModal =
    mounted &&
    showPdf &&
    pdfUrl &&
    createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 sm:p-6"
        onClick={() => setShowPdf(false)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[min(90dvh,900px)] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-white shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {title}
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Nouvel onglet</span>
              </a>
              <button
                type="button"
                onClick={() => setShowPdf(false)}
                className="inline-flex h-10 w-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 bg-gray-100">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title={title}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <div
        className={`bg-white rounded-2xl shadow-lg border border-gray-200 p-5 space-y-4 ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Fiche technique (PDF)</h3>
            <p className="text-xs text-gray-500">
              {hasPdf
                ? "Un PDF est déjà associé — vous pouvez le consulter ou le remplacer."
                : "Aucun PDF pour le moment — vous pouvez en ajouter un."}
            </p>
          </div>
        </div>

        {hasPdf && pdfUrl && (
          <button
            type="button"
            onClick={() => setShowPdf(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            Voir la fiche technique
          </button>
        )}

        {!hasPdf && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Espace fiche technique vide</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {hasPdf ? "Remplacer le PDF" : "Téléverser un PDF"}
          </label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFilePick}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600 truncate">{selectedFile.name}</p>
          )}
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {hasPdf ? "Mettre à jour le PDF" : "Ajouter le PDF"}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border-l-4 border-green-500 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
      </div>

      {pdfModal}
    </>
  );
}
