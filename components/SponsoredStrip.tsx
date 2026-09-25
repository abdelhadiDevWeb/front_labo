"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { formatCatalogPriceDa } from "@/lib/catalog-price";

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function StripTile({ product }: { product: SponsoredPublicProduct }) {
  const image = product.images?.[0] ? getMediaUrl(product.images[0]) : null;
  const priceLabel = formatCatalogPriceDa(product.price, 0);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block h-full w-full overflow-hidden bg-slate-200"
      style={{ height: 70 }}
      aria-label={product.name}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-100">
          <ImageIcon className="h-5 w-5 text-gray-400" />
        </div>
      )}

      {/* Bottom linear gradient — only on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center pb-2 opacity-0 transition-all duration-300 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur-[2px] drop-shadow">
          {priceLabel}
        </span>
      </div>
    </Link>
  );
}

export default function SponsoredProductsCarousel() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomDelay] = useState(() => -(Math.random() * 20 + 5));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getSponsoredProducts();
        if (cancelled) return;
        if (result.success && result.data?.products?.length) {
          setProducts(shuffleArray(result.data.products));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldScroll = products.length > 3;

  const loopProducts = useMemo(() => {
    if (products.length === 0) return [];
    return shouldScroll ? [...products, ...products] : products;
  }, [products, shouldScroll]);

  const animationDuration = Math.max(products.length * 7, 28);

  if (isLoading) {
    return (
      <section
        id="sponsored-section"
        className="border-b border-slate-200 bg-slate-100"
        style={{ height: 70 }}
        aria-hidden
      >
        <div className="grid h-full grid-cols-3 gap-px">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-slate-200" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  if (!shouldScroll) {
    return (
      <section
        id="sponsored-section"
        data-sponsor-ui="strip-70"
        className="border-b border-slate-200 bg-white"
        style={{ height: 70 }}
      >
        <div className="mx-auto grid h-full max-w-[1600px] grid-cols-3 gap-px bg-slate-200">
          {products.map((product) => (
            <StripTile key={product.id} product={product} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      id="sponsored-section"
      data-sponsor-ui="strip-70"
      className="relative overflow-hidden border-b border-slate-200 bg-white"
      style={{ height: 70 }}
    >
      <div
        className="sponsored-marquee-track flex h-full gap-px"
        style={{
          animationDuration: `${animationDuration}s`,
          animationDelay: `${randomDelay}s`,
          height: 70,
        }}
      >
        {loopProducts.map((product, index) => (
          <div
            key={`${product.id}-${index}`}
            className="flex-shrink-0"
            style={{ width: "33.333vw", minWidth: "33.333vw", height: 70 }}
          >
            <StripTile product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
