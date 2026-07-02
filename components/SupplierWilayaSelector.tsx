"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, CheckSquare, Square } from "lucide-react";
import { ALGERIA_WILAYAS } from "@/lib/algeria-wilayas";

interface SupplierWilayaSelectorProps {
  coversAllWilayas: boolean;
  selectedCodes: string[];
  onCoversAllChange: (value: boolean) => void;
  onSelectedCodesChange: (codes: string[]) => void;
}

export default function SupplierWilayaSelector({
  coversAllWilayas,
  selectedCodes,
  onCoversAllChange,
  onSelectedCodesChange,
}: SupplierWilayaSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredWilayas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALGERIA_WILAYAS;
    return ALGERIA_WILAYAS.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.ar_name.includes(q) ||
        w.code.includes(q)
    );
  }, [search]);

  const toggleWilaya = (code: string) => {
    if (selectedCodes.includes(code)) {
      onSelectedCodesChange(selectedCodes.filter((c) => c !== code));
    } else {
      onSelectedCodesChange([...selectedCodes, code]);
    }
  };

  const selectAllFiltered = () => {
    const codes = new Set(selectedCodes);
    filteredWilayas.forEach((w) => codes.add(w.code));
    onSelectedCodesChange([...codes]);
  };

  const clearSelection = () => onSelectedCodesChange([]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
          <input
            type="radio"
            name="wilayaCoverage"
            checked={coversAllWilayas}
            onChange={() => onCoversAllChange(true)}
            className="w-5 h-5 text-green-600"
          />
          <div>
            <span className="font-medium text-gray-900 block">Toutes les wilayas</span>
            <span className="text-sm text-gray-500">Livraison / service sur tout le territoire national</span>
          </div>
        </label>
        <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 flex-1">
          <input
            type="radio"
            name="wilayaCoverage"
            checked={!coversAllWilayas}
            onChange={() => onCoversAllChange(false)}
            className="w-5 h-5 text-green-600"
          />
          <div>
            <span className="font-medium text-gray-900 block">Wilayas sélectionnées</span>
            <span className="text-sm text-gray-500">Choisir une ou plusieurs wilayas</span>
          </div>
        </label>
      </div>

      {!coversAllWilayas && (
        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une wilaya..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
              />
            </div>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-3 py-1.5 text-green-700 bg-green-50 rounded-lg hover:bg-green-100"
              >
                Tout sélectionner
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Effacer
              </button>
            </div>
          </div>
          <p className="px-4 py-2 text-sm text-gray-600 bg-white border-b border-gray-100">
            {selectedCodes.length} wilaya{selectedCodes.length > 1 ? "s" : ""} sélectionnée
            {selectedCodes.length > 1 ? "s" : ""} sur {ALGERIA_WILAYAS.length}
          </p>
          <div className="max-h-64 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredWilayas.map((wilaya) => {
              const checked = selectedCodes.includes(wilaya.code);
              return (
                <button
                  key={wilaya.code}
                  type="button"
                  onClick={() => toggleWilaya(wilaya.code)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                    checked ? "bg-green-50 border border-green-200" : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-gray-500 font-mono text-xs w-6">{wilaya.code}</span>
                  <span className="text-gray-800 truncate">{wilaya.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {coversAllWilayas && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          Vous couvrez les {ALGERIA_WILAYAS.length} wilayas d&apos;Algérie.
        </div>
      )}
    </div>
  );
}
