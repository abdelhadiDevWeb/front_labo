"use client";

import Link from "next/link";
import {
  Building2,
  Tag,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { SponsoredPublicProduct } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import CatalogPrice from "@/components/CatalogPrice";

type SponsoredProductCardProps = {
  product: SponsoredPublicProduct;
  className?: string;
  /** full = listing card; strip = image-only banner tile */
  variant?: "full" | "strip";
};

export default function SponsoredProductCard({
  product,
  className = "w-[300px] sm:w-[340px]",
  variant = "full",
}: SponsoredProductCardProps) {
  const image = product.images?.[0] ? getMediaUrl(product.images[0]) : null;
  const endDate = new Date(product.sponsorEndDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (variant === "strip") {
    return (
      <Link
        href={`/products/${product.id}`}
        className={`group relative block h-[250px] overflow-hidden bg-slate-200 ${className}`}
        aria-label={product.name}
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/45" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <CatalogPrice
            amount={product.price}
            className="text-xl font-bold text-white drop-shadow-md sm:text-2xl"
            lockedClassName="text-sm font-medium text-white/90"
            linkToLogin={false}
          />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group flex-shrink-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg transition-all duration-300 hover:border-purple-200 hover:shadow-2xl ${className}`}
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-14 w-14 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
          <Sparkles className="h-3.5 w-3.5" />
          Sponsorisé
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="line-clamp-2 text-lg font-bold text-white drop-shadow-md">{product.name}</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <CatalogPrice
            amount={product.price}
            className="text-2xl font-extrabold text-blue-600"
            lockedClassName="text-xs font-medium text-gray-500"
            linkToLogin={false}
          />
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              product.productType === "Labo médical"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {product.productType}
          </span>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600">
          {product.supplier && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="truncate">{product.supplier.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">
              {product.brand} · {product.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>{product.deliveryTime}</span>
          </div>
          {product.wilaya && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <span className="truncate">{product.wilaya}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-xs font-medium text-purple-700">Jusqu&apos;au {endDate}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition-all group-hover:gap-2">
            Voir
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
