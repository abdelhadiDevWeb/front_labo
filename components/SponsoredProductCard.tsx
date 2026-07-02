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

type SponsoredProductCardProps = {
  product: SponsoredPublicProduct;
  className?: string;
};

export default function SponsoredProductCard({
  product,
  className = "w-[300px] sm:w-[340px]",
}: SponsoredProductCardProps) {
  const image = product.images?.[0] ? getMediaUrl(product.images[0]) : null;
  const endDate = new Date(product.sponsorEndDate).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group flex-shrink-0 bg-white rounded-2xl border border-gray-200/80 shadow-lg hover:shadow-2xl hover:border-purple-200 transition-all duration-300 overflow-hidden ${className}`}
    >
      <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-14 h-14 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600 text-white text-xs font-bold shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />
          Sponsorisé
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-bold text-lg line-clamp-2 drop-shadow-md">{product.name}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-extrabold text-blue-600">
            {product.price.toLocaleString("fr-FR")} <span className="text-sm font-semibold">DA</span>
          </p>
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
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
              <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{product.supplier.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {product.brand} · {product.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{product.deliveryTime}</span>
          </div>
          {product.wilaya && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{product.wilaya}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-purple-700 font-medium">Jusqu&apos;au {endDate}</span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all">
            Voir
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
