"use client";

import { Star } from "lucide-react";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Lab-facing badge for supplier-marked recommendations. */
export default function RecommendedBadge({ className = "", compact = false }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-500 text-white font-semibold shadow-sm ${
        compact
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[10px] sm:px-3 sm:text-xs"
      } ${className}`}
    >
      <Star className={compact ? "h-3 w-3 fill-current" : "h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current"} />
      Recommandé
    </span>
  );
}
