"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";

type ExpandableValueProps = {
  value: string | number | null | undefined;
  /** Modal title (field / card label). */
  title?: string;
  /** Soft char limit — eye appears when longer, even if CSS does not overflow. */
  maxLength?: number;
  className?: string;
  valueClassName?: string;
  eyeClassName?: string;
  /** Prefer single-line ellipsis (default) or multi-line clamp. */
  lines?: 1 | 2 | 3;
  emptyLabel?: string;
};

/**
 * Truncates long card values with "…" and an eye control that opens the full text in a modal.
 */
export default function ExpandableValue({
  value,
  title = "Détail",
  maxLength = 24,
  className = "",
  valueClassName = "",
  eyeClassName = "",
  lines = 1,
  emptyLabel = "—",
}: ExpandableValueProps) {
  const text = value == null || value === "" ? "" : String(value);
  const isEmpty = !text;
  const needsExpand = !isEmpty && text.length > maxLength;
  const truncated = needsExpand
    ? `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
    : text || emptyLabel;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clampClass =
    lines === 1
      ? "truncate"
      : lines === 2
        ? "line-clamp-2 break-words"
        : "line-clamp-3 break-words";

  return (
    <>
      <span className={`inline-flex items-center gap-1.5 min-w-0 max-w-full ${className}`}>
        <span
          className={`min-w-0 ${clampClass} ${valueClassName}`}
          title={needsExpand ? text : undefined}
        >
          {truncated}
        </span>
        {needsExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors ${eyeClassName}`}
            aria-label={`Voir entièrement : ${title}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
      </span>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div
              className="bg-white w-full max-w-lg sm:rounded-2xl shadow-2xl overflow-hidden max-h-[min(85dvh,640px)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-start justify-between gap-3 border-b border-gray-100 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Contenu complet
                  </p>
                  <h3 id={titleId} className="text-base sm:text-lg font-bold text-gray-900 truncate">
                    {title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-800"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                  {text}
                </p>
              </div>
              <div className="shrink-0 border-t border-gray-100 px-4 sm:px-5 py-3 bg-gray-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
