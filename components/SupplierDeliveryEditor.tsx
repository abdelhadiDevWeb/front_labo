"use client";

import { useMemo, useState } from "react";
import { Truck, Search, X, Check } from "lucide-react";
import { ALGERIA_WILAYAS, getWilayaLabel } from "@/lib/algeria-wilayas";

type Props = {
  deliveryNoteAll: string;
  deliveryByWilaya: Record<string, string>;
  onDeliveryNoteAllChange: (value: string) => void;
  onDeliveryByWilayaChange: (next: Record<string, string>) => void;
};

/**
 * Supplier profile editor: default note for all wilayas + search → pick wilaya → write note.
 */
export default function SupplierDeliveryEditor({
  deliveryNoteAll,
  deliveryByWilaya,
  onDeliveryNoteAllChange,
  onDeliveryByWilayaChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALGERIA_WILAYAS;
    return ALGERIA_WILAYAS.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.includes(q) ||
        w.code.padStart(2, "0").includes(q) ||
        (w.ar_name || "").includes(search.trim())
    );
  }, [search]);

  const filledEntries = useMemo(
    () =>
      Object.entries(deliveryByWilaya)
        .filter(([, note]) => note?.trim())
        .sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b)),
    [deliveryByWilaya]
  );

  const applyToAll = () => {
    const text = deliveryNoteAll.trim();
    if (!text) return;
    const next: Record<string, string> = { ...deliveryByWilaya };
    for (const w of ALGERIA_WILAYAS) {
      next[w.code] = text;
    }
    onDeliveryByWilayaChange(next);
  };

  const clearAllPerWilaya = () => {
    onDeliveryByWilayaChange({});
    setSelectedCode(null);
  };

  const setWilayaNote = (code: string, note: string) => {
    const next = { ...deliveryByWilaya };
    if (!note.trim()) {
      delete next[code];
    } else {
      next[code] = note;
    }
    onDeliveryByWilayaChange(next);
  };

  const selectedWilaya = selectedCode
    ? ALGERIA_WILAYAS.find((w) => w.code === selectedCode)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Truck className="w-4 h-4 text-green-600" />
          Texte pour toutes les wilayas
        </label>
        <textarea
          value={deliveryNoteAll}
          onChange={(e) => onDeliveryNoteAllChange(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex: Livraison sous 48–72h, frais selon distance…"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyToAll}
            disabled={!deliveryNoteAll.trim()}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Appliquer ce texte à toutes les wilayas
          </button>
          <button
            type="button"
            onClick={clearAllPerWilaya}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Effacer les notes par wilaya
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Le texte « toutes les wilayas » s&apos;affiche par défaut. Une note par wilaya le
          remplace pour cette wilaya uniquement.
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Note de livraison pour une wilaya
        </p>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une wilaya (nom ou code)…"
            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
          />
        </div>

        {!selectedCode ? (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">Aucune wilaya trouvée</p>
            ) : (
              filtered.map((w) => {
                const hasNote = Boolean(deliveryByWilaya[w.code]?.trim());
                return (
                  <button
                    key={w.code}
                    type="button"
                    onClick={() => {
                      setSelectedCode(w.code);
                      setSearch("");
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-green-50 transition-colors"
                  >
                    <span className="font-medium text-gray-800">
                      {w.code.padStart(2, "0")} — {w.name}
                    </span>
                    {hasNote ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Renseignée
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Écrire →</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-green-200 bg-green-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Wilaya sélectionnée
                </p>
                <p className="text-base font-bold text-gray-900">
                  {selectedWilaya
                    ? `${selectedWilaya.code.padStart(2, "0")} — ${selectedWilaya.name}`
                    : getWilayaLabel(selectedCode)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCode(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={deliveryByWilaya[selectedCode] || ""}
              onChange={(e) => setWilayaNote(selectedCode, e.target.value)}
              rows={4}
              maxLength={2000}
              autoFocus
              placeholder="Délai / frais / conditions pour cette wilaya…"
              className="w-full px-3 py-2.5 text-sm border-2 border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none bg-white"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCode(null)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Enregistrer & choisir une autre
              </button>
              <button
                type="button"
                onClick={() => {
                  setWilayaNote(selectedCode, "");
                  setSelectedCode(null);
                }}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-white"
              >
                Effacer cette note
              </button>
            </div>
          </div>
        )}
      </div>

      {filledEntries.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Wilayas déjà renseignées ({filledEntries.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {filledEntries.map(([code]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedCode(code);
                  setSearch("");
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              >
                {code.padStart(2, "0")} — {getWilayaLabel(code)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
