"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Calendar,
  ArrowRight,
  Image as ImageIcon,
  Tag,
  Gift,
} from "lucide-react";
import { PublicPromotion } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";

type PromotionCardProps = {
  promotion: PublicPromotion;
  className?: string;
};

export default function PromotionCard({ promotion, className = "" }: PromotionCardProps) {
  const product = promotion.product;
  const freeProduct = promotion.freeProduct;
  const image = product?.images?.[0] ? getMediaUrl(product.images[0]) : null;
  const freeImage = freeProduct?.images?.[0]
    ? getMediaUrl(freeProduct.images[0])
    : null;
  const { canSeePrice } = useCanSeeCatalogPrice();
  const endDate = new Date(promotion.end_day).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (!product) return null;

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-orange-100 shadow-lg hover:shadow-xl hover:border-orange-300 transition-all duration-300 overflow-hidden flex flex-col ${className}`}
    >
      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-md">
        -{promotion.discountPercent}%
      </div>

      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-40 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-orange-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-bold text-base line-clamp-2 drop-shadow">
              {product.name}
            </p>
          </div>
        </div>
      </Link>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-end gap-2 flex-wrap min-h-[2rem]">
          {canSeePrice ? (
            <>
              <span className="text-sm text-gray-400 line-through">
                {promotion.normal_price.toLocaleString("fr-FR")} DA
              </span>
              <span className="text-2xl font-extrabold text-orange-600">
                {promotion.price_discount.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-semibold">DA</span>
              </span>
              <span className="text-xs text-gray-500">/ unité</span>
            </>
          ) : (
            <CatalogPrice
              amount={promotion.price_discount}
              visible={false}
              linkToLogin={false}
              lockedClassName="text-xs font-medium text-gray-500"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">
            <ShoppingBag className="w-3.5 h-3.5" />
            Min. {promotion.min_quantity} unité
            {promotion.min_quantity > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
            <Calendar className="w-3.5 h-3.5" />
            Jusqu&apos;au {endDate}
          </span>
        </div>

        {(product.brand || product.category) && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Tag className="w-3.5 h-3.5" />
            <span className="truncate">
              {[product.brand, product.category].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        {freeProduct && (
          <Link
            href={`/products/${freeProduct.id}`}
            className="mt-auto flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 hover:bg-emerald-100 transition-colors"
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white border border-emerald-100">
              {freeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={freeImage}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gift className="h-5 w-5 text-emerald-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
                <Gift className="h-3 w-3" />
                Offert gratuitement
              </p>
              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                {freeProduct.name}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                Voir la fiche →
              </p>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">Offre limitée</span>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:gap-2 transition-all"
          >
            Voir le produit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
