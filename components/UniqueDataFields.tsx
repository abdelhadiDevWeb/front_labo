"use client";

import { getUniqueDataEntries } from "@/lib/unique-data-display";
import { isPriceFieldKey } from "@/lib/catalog-price";

type Props = {
  data: Record<string, unknown> | null | undefined;
  max?: number;
  className?: string;
  excludeKeys?: string[];
  /** Hide prix / price fields (e.g. for guests). */
  hidePrices?: boolean;
};

export default function UniqueDataFields({
  data,
  max = 8,
  className = "",
  excludeKeys,
  hidePrices = false,
}: Props) {
  const entries = getUniqueDataEntries(data, { max, excludeKeys }).filter(
    ([key]) => !(hidePrices && isPriceFieldKey(key))
  );

  if (entries.length === 0) {
    return (
      <p className={`text-xs text-gray-400 ${className}`}>Aucune donnée disponible</p>
    );
  }

  return (
    <div
      className={`rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5 max-h-40 overflow-y-auto ${className}`}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex justify-between gap-3 text-xs sm:text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0"
        >
          <span className="text-gray-500 font-medium shrink-0">{key}</span>
          <span className="text-gray-900 text-right break-all font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}
