"use client";

import { Truck } from "lucide-react";
import { ALGERIA_WILAYAS, getWilayaLabel } from "@/lib/algeria-wilayas";

type SupplierDeliveryNotesProps = {
  deliveryNoteAll?: string;
  deliveryByWilaya?: Record<string, string>;
  /** Highlight this wilaya code when present */
  highlightWilayaCode?: string | null;
  className?: string;
};

/** Resolve note for a wilaya: per-wilaya override, else default-for-all. */
export function resolveDeliveryNote(
  code: string | null | undefined,
  deliveryNoteAll?: string,
  deliveryByWilaya?: Record<string, string>
): string {
  if (!code) return (deliveryNoteAll || "").trim();
  const specific = deliveryByWilaya?.[code]?.trim();
  if (specific) return specific;
  return (deliveryNoteAll || "").trim();
}

export default function SupplierDeliveryNotes({
  deliveryNoteAll = "",
  deliveryByWilaya = {},
  highlightWilayaCode = null,
  className = "",
}: SupplierDeliveryNotesProps) {
  const defaultNote = deliveryNoteAll.trim();
  const entries = Object.entries(deliveryByWilaya)
    .filter(([, note]) => note?.trim())
    .sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b));

  const highlighted = highlightWilayaCode
    ? resolveDeliveryNote(highlightWilayaCode, deliveryNoteAll, deliveryByWilaya)
    : "";

  if (!defaultNote && entries.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
          <Truck className="w-5 h-5 text-sky-700" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
            Livraison par wilaya
          </h3>
          <p className="text-xs text-gray-500">Infos renseignées par le fournisseur</p>
        </div>
      </div>

      {highlightWilayaCode && highlighted && (
        <div className="rounded-xl bg-white border border-sky-200 p-3">
          <p className="text-xs font-semibold text-sky-800 mb-1">
            Votre wilaya — {getWilayaLabel(highlightWilayaCode)}
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{highlighted}</p>
        </div>
      )}

      {defaultNote && (
        <div className="rounded-xl bg-white/80 border border-sky-100 p-3">
          <p className="text-xs font-semibold text-gray-600 mb-1">Toutes les wilayas</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{defaultNote}</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {entries.map(([code, note]) => (
            <div
              key={code}
              className={`rounded-lg border px-3 py-2 ${
                highlightWilayaCode === code
                  ? "border-sky-400 bg-sky-100/50"
                  : "border-gray-100 bg-white"
              }`}
            >
              <p className="text-xs font-semibold text-gray-700">
                {code.padStart(2, "0")} — {getWilayaLabel(code)}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{note}</p>
            </div>
          ))}
        </div>
      )}

      {!entries.length && !defaultNote && ALGERIA_WILAYAS.length === 0 ? null : null}
    </div>
  );
}
