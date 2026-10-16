"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  getGuestUniqueDataEntries,
  getUniqueDataEntries,
} from "@/lib/unique-data-display";
import { isPriceFieldKey } from "@/lib/catalog-price";
import AntiCapturePrice from "@/components/AntiCapturePrice";

type Props = {
  data: Record<string, unknown> | null | undefined;
  max?: number;
  className?: string;
  excludeKeys?: string[];
  /** Hide prix / price fields (e.g. for guests). */
  hidePrices?: boolean;
  /** Render visible prix / price values with the anti-capture canvas. */
  protectPrices?: boolean;
  /**
   * Guests: only Nom, Conditionnement, DDP (if present) + login note.
   * Logged-in users: full unique_data (minus excludes / prices rules).
   */
  guestOnly?: boolean;
  loginHref?: string;
};

export default function UniqueDataFields({
  data,
  max = 8,
  className = "",
  excludeKeys,
  hidePrices = false,
  protectPrices = false,
  guestOnly = false,
  loginHref = "/login",
}: Props) {
  const entries = guestOnly
    ? getGuestUniqueDataEntries(data)
    : getUniqueDataEntries(data, { max, excludeKeys }).filter(
        ([key]) => !(hidePrices && isPriceFieldKey(key))
      );

  if (entries.length === 0 && !guestOnly) {
    return (
      <p className={`text-xs text-gray-400 ${className}`}>Aucune donnée disponible</p>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5 max-h-40 overflow-y-auto">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex justify-between gap-3 text-xs sm:text-sm border-b border-gray-100 last:border-0 pb-1 last:pb-0"
            >
              <span className="text-gray-500 font-medium shrink-0">{key}</span>
              {protectPrices && isPriceFieldKey(key) ? (
                <AntiCapturePrice
                  text={String(value)}
                  fontSize={22}
                  color="#111827"
                  background="#f9fafb"
                  className="ml-auto"
                />
              ) : (
                <span className="text-gray-900 text-right break-all font-semibold">
                  {value}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {guestOnly ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-700" />
          <p>
            Les détails complets sont visibles après connexion.{" "}
            <Link
              href={loginHref}
              className="font-semibold text-amber-950 underline underline-offset-2 hover:text-blue-700"
            >
              Se connecter
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
