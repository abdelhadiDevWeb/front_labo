"use client";

import { useEffect, useState } from "react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";

let cache: SponsoredPublicProduct[] | null = null;
let cachePromise: Promise<SponsoredPublicProduct[]> | null = null;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function loadSponsored(): Promise<SponsoredPublicProduct[]> {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = (async () => {
      try {
        const result = await getSponsoredProducts();
        const list =
          result.success && result.data?.products?.length
            ? shuffleArray(result.data.products)
            : [];
        cache = list;
        return list;
      } catch {
        cache = [];
        return [];
      } finally {
        cachePromise = null;
      }
    })();
  }
  return cachePromise;
}

/** Shared sponsored catalog fetch (shuffled once per page session). */
export function useSponsoredProducts() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>(cache ?? []);
  const [loaded, setLoaded] = useState(cache !== null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await loadSponsored();
      if (cancelled) return;
      setProducts(list);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loaded };
}
