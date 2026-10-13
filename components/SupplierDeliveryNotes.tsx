"use client";

import { MapPin, Truck } from "lucide-react";
import {
  ALGERIA_WILAYAS,
  getWilayaLabel,
  supplierCoversWilaya,
} from "@/lib/algeria-wilayas";

type SupplierDeliveryNotesProps = {
  deliveryNoteAll?: string;
  deliveryByWilaya?: Record<string, string>;
  /** Coverage zones chosen by the supplier in their profile */
  wilayas?: string[];
  coversAllWilayas?: boolean;
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

const sortByCode = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b);

export default function SupplierDeliveryNotes({
  deliveryNoteAll = "",
  deliveryByWilaya = {},
  wilayas = [],
  coversAllWilayas = false,
  highlightWilayaCode = null,
  className = "",
}: SupplierDeliveryNotesProps) {
  const defaultNote = deliveryNoteAll.trim();
  const entries = Object.entries(deliveryByWilaya)
    .filter(([, note]) => note?.trim())
    .sort(([a], [b]) => sortByCode(a, b));
  const coverageCodes = Array.from(new Set(wilayas.filter(Boolean))).sort(sortByCode);
  const hasCoverage = coversAllWilayas || coverageCodes.length > 0;

  const highlighted = highlightWilayaCode
    ? resolveDeliveryNote(highlightWilayaCode, deliveryNoteAll, deliveryByWilaya)
    : "";
  const visitorCovered =
    highlightWilayaCode && hasCoverage
      ? supplierCoversWilaya({ coversAllWilayas, wilayas: coverageCodes }, highlightWilayaCode)
      : null;

  if (!defaultNote && entries.length === 0 && !hasCoverage) return null;

  return (
    <div
      className={`rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 text-sky-700" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">
            Détails de livraison
          </h3>
          <p className="text-xs text-gray-500">Infos renseignées par le fournisseur</p>
        </div>
      </div>

      {highlightWilayaCode && (highlighted || visitorCovered !== null) && (
        <div
          className={`rounded-xl bg-white border p-3 ${
            visitorCovered === false ? "border-amber-200" : "border-sky-200"
          }`}
        >
          <p className="text-xs font-semibold text-sky-800 mb-1">
            Votre wilaya — {getWilayaLabel(highlightWilayaCode)}
          </p>
          {visitorCovered === false ? (
            <p className="text-sm text-amber-700">
              Cette wilaya ne fait pas partie des zones de couverture du fournisseur.
            </p>
          ) : (
            highlighted && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{highlighted}</p>
            )
          )}
          {visitorCovered === true && !highlighted && (
            <p className="text-sm text-gray-800">Le fournisseur livre dans votre wilaya.</p>
          )}
        </div>
      )}

      {hasCoverage && (
        <div className="rounded-xl bg-white/80 border border-sky-100 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
            <MapPin className="w-3.5 h-3.5" />
            Zones de couverture
          </p>
          {coversAllWilayas ? (
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Toutes les wilayas ({ALGERIA_WILAYAS.length})
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {coverageCodes.map((code) => (
                <span
                  key={code}
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    highlightWilayaCode === code
                      ? "bg-sky-600 text-white"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {code.padStart(2, "0")} — {getWilayaLabel(code)}
                </span>
              ))}
            </div>
          )}
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
    </div>
  );
}
