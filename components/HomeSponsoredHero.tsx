"use client";

/**
 * Sponsored banner under the header — 200px full-bleed slides.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import CatalogPrice from "@/components/CatalogPrice";

const BANNER_H = 200;
const AUTO_MS = 5500;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function HomeSponsoredHero() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getSponsoredProducts();
        if (cancelled) return;
        if (result.success && result.data?.products?.length) {
          setProducts(shuffleArray(result.data.products));
        } else {
          setProducts([]);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = products.length;
  const go = useCallback(
    (dir: 1 | -1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => go(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [count, paused, go, index]);

  // First paint: nothing. After API: show only if there are sponsors.
  if (!loaded || count === 0) return null;

  const product = products[index];
  if (!product) return null;
  const detail = [product.brand, product.category].filter(Boolean).join(" · ");

  return (
    <section
      id="sponsored-section"
      className="relative border-b border-neutral-200 scroll-mt-24"
      style={{ height: BANNER_H }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-full overflow-hidden bg-neutral-900" style={{ height: BANNER_H }}>
        {products.map((p, i) => {
          const src = p.images?.[0] ? getMediaUrl(p.images[0]) : null;
          return (
            <div
              key={p.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
              aria-hidden={i !== index}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                  <ImageIcon className="h-8 w-8 text-neutral-500" />
                </div>
              )}
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/85 via-black/50 to-transparent"
          aria-hidden
        />

        <div className="relative z-[3] flex h-full items-center max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1 pr-10 sm:pr-16">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm border border-white/20 mb-1">
              <Sparkles className="h-3 w-3 text-amber-300" />
              Sponsorisé
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight line-clamp-1 drop-shadow">
              {product.name}
            </h2>
            {detail ? (
              <p className="mt-0.5 text-[11px] sm:text-xs text-white/70 line-clamp-1">{detail}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
              <CatalogPrice
                amount={product.price}
                className="text-sm sm:text-base font-bold text-white"
                lockedClassName="text-[11px] font-medium text-white/80"
                linkToLogin={false}
              />
              <Link
                href={`/products/${product.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                Voir
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-1 sm:left-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm hover:bg-black/60"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-1 sm:right-2 top-1/2 z-[4] -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm hover:bg-black/60"
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="absolute bottom-1.5 left-1/2 z-[4] flex -translate-x-1/2 gap-1">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? "w-4 bg-white" : "w-1 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
