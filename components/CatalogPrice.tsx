"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getSessionRole } from "@/lib/api";
import { formatCatalogPriceDa } from "@/lib/catalog-price";

type CatalogPriceProps = {
  amount: number | string | null | undefined;
  /** When provided, skips the internal session check. */
  visible?: boolean;
  className?: string;
  lockedClassName?: string;
  /** Show a compact login hint when hidden (default true). */
  showLoginHint?: boolean;
  /** When false, hint is plain text (use inside another Link). Default true. */
  linkToLogin?: boolean;
  fractionDigits?: number;
  loginHref?: string;
};

/**
 * Catalog selling price — hidden for guests, shown after login.
 * While auth is unknown, price stays hidden to avoid a guest flash.
 */
export default function CatalogPrice({
  amount,
  visible,
  className = "text-2xl font-bold text-blue-600",
  lockedClassName = "text-sm font-medium text-gray-500",
  showLoginHint = true,
  linkToLogin = true,
  fractionDigits = 2,
  loginHref = "/login",
}: CatalogPriceProps) {
  const [sessionVisible, setSessionVisible] = useState(false);
  const [ready, setReady] = useState(visible !== undefined);

  useEffect(() => {
    if (visible !== undefined) {
      setReady(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      const session = await getSessionRole();
      if (cancelled) return;
      setSessionVisible(Boolean(session?.role));
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const canSee = visible !== undefined ? visible : sessionVisible;

  if (!ready) {
    return (
      <span className={`${lockedClassName} inline-block min-h-[1.25em] opacity-40`} aria-hidden>
        ···
      </span>
    );
  }

  if (!canSee) {
    if (!showLoginHint) return null;
    const hint = (
      <>
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <span>Connectez-vous pour voir le prix</span>
      </>
    );
    if (!linkToLogin) {
      return (
        <span className={`${lockedClassName} inline-flex items-center gap-1.5`}>
          {hint}
        </span>
      );
    }
    return (
      <Link
        href={loginHref}
        className={`${lockedClassName} inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors`}
      >
        {hint}
      </Link>
    );
  }

  return <span className={className}>{formatCatalogPriceDa(amount, fractionDigits)}</span>;
}

/** Hook for pages that already need auth and also gate price filters / unique_data. */
export function useCanSeeCatalogPrice(): { canSeePrice: boolean; ready: boolean } {
  const [canSeePrice, setCanSeePrice] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSessionRole();
      if (cancelled) return;
      setCanSeePrice(Boolean(session?.role));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { canSeePrice, ready };
}
