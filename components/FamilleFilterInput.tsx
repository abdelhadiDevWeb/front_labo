"use client";

import { Layers, Loader2, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** True while the list reloads for the typed famille. */
  busy?: boolean;
  className?: string;
};

/** Free-text "Famille" filter — the catalog is searched server-side on the item's Famille column. */
export default function FamilleFilterInput({ value, onChange, busy = false, className = "" }: Props) {
  return (
    <div className={className}>
      <label htmlFor="famille-filter" className="mb-1 block text-xs font-semibold text-gray-600">
        Famille
      </label>
      <div className="relative">
        <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id="famille-filter"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex : Biochimie, Hématologie…"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full min-h-11 rounded-xl border border-gray-300 bg-white pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        {busy ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
        ) : value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Effacer la famille"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 active:bg-gray-100 sm:hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
