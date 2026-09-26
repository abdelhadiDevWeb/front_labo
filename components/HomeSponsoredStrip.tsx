"use client";

/**
 * Compact sponsor strip under the home header.
 * 120px · image cover · max 3 per row · hover gradient + details · marquee RTL when >3.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { formatCatalogPriceDa } from "@/lib/catalog-price";

const STRIP_H = 120;
const MAX_VISIBLE = 3;

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Tile({ product }: { product: SponsoredPublicProduct }) {
  const image = (product.sponsorImage || product.images?.[0])
    ? getMediaUrl(product.sponsorImage || product.images[0])
    : null;
  const priceLabel = formatCatalogPriceDa(product.price, 0);
  const detail = [product.brand, product.category].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block h-full w-full overflow-hidden bg-white"
      style={{ height: STRIP_H }}
      aria-label={product.name}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-center p-1 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <ImageIcon className="h-5 w-5 text-neutral-400" />
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end gap-0.5 px-3 pb-2 opacity-0 translate-y-2 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="truncate text-[11px] font-medium leading-tight text-white/90">
          {product.name}
        </span>
        {detail ? (
          <span className="truncate text-[10px] leading-tight text-white/70">{detail}</span>
        ) : null}
        <span className="text-xs font-semibold leading-tight text-white">{priceLabel}</span>
      </div>
    </Link>
  );
}

export default function HomeSponsoredStrip() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomDelay] = useState(() => -(Math.random() * 18 + 4));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getSponsoredProducts();
        if (cancelled) return;
        if (result.success && result.data?.products?.length) {
          setProducts(shuffleArray(result.data.products));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldScroll = products.length > MAX_VISIBLE;

  const loopProducts = useMemo(() => {
    if (!products.length) return [];
    return shouldScroll ? [...products, ...products] : products;
  }, [products, shouldScroll]);

  const animationDuration = Math.max(products.length * 6, 24);

  /** 1 → 1 col, 2 → 2 cols, 3 → 3 cols (never empty slots) */
  const staticCols = Math.min(products.length, MAX_VISIBLE);
  const staticColClass =
    staticCols === 1
      ? "grid-cols-1"
      : staticCols === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  if (isLoading) {
    return (
      <section
        id="sponsored-section"
        className="border-b border-neutral-200 bg-neutral-100"
        style={{ height: STRIP_H }}
        aria-hidden
      >
        <div className="h-full w-full animate-pulse bg-neutral-300/80" />
      </section>
    );
  }

  if (!products.length) return null;

  if (!shouldScroll) {
    return (
      <section
        id="sponsored-section"
        className="border-b border-neutral-200 bg-white"
        style={{ height: STRIP_H }}
      >
        <div
          className={`mx-auto grid h-full max-w-[1600px] gap-px bg-neutral-200 ${staticColClass}`}
          style={{ height: STRIP_H }}
        >
          {products.map((p) => (
            <Tile key={p.id} product={p} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="sponsored-section"
      className="relative overflow-hidden border-b border-neutral-200 bg-white"
      style={{ height: STRIP_H }}
    >
      <div
        className="sponsored-marquee-track flex"
        style={{
          height: STRIP_H,
          animationDuration: `${animationDuration}s`,
          animationDelay: `${randomDelay}s`,
        }}
      >
        {loopProducts.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="shrink-0"
            style={{
              width: `${100 / MAX_VISIBLE}vw`,
              minWidth: `${100 / MAX_VISIBLE}vw`,
              height: STRIP_H,
            }}
          >
            <Tile product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
