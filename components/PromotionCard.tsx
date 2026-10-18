"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ShoppingCart,
  Calendar,
  ArrowRight,
  Image as ImageIcon,
  Tag,
  Gift,
} from "lucide-react";
import { PublicPromotion } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { catalogItemHref } from "@/lib/catalog-item";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";
import CartPanel from "@/components/CartPanel";
import { useCart } from "@/contexts/CartContext";

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
  const { canSeePrice, ready, role } = useCanSeeCatalogPrice();
  const { addToCart } = useCart();
  const router = useRouter();
  const [cartOpen, setCartOpen] = useState(false);
  const endDate = new Date(promotion.end_day).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (!product) return null;

  const productHref = catalogItemHref(promotion.itemType, product.id);
  const viewLabel =
    promotion.itemType === "machine"
      ? "Voir la machine"
      : promotion.itemType === "service"
        ? "Voir le service"
        : "Voir le produit";
  const reservable = promotion.itemType !== "service";
  const stock = typeof product.quantity === "number" ? Math.max(0, product.quantity) : null;
  const outOfStock = stock === 0;
  const stockBelowMin = stock !== null && stock > 0 && stock < promotion.min_quantity;
  const startQuantity = stockBelowMin ? (stock as number) : promotion.min_quantity;
  const isGiftOffer = Boolean(freeProduct) && promotion.price_discount >= promotion.normal_price;
  const isLabClient = role === "client";
  const blockedForRole = ready && Boolean(role) && !isLabClient;

  const handleAddToCart = () => {
    if (!ready) return;
    if (!role) {
      router.push("/login");
      return;
    }
    if (!isLabClient || outOfStock) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: promotion.price_discount,
        supplierId: promotion.id_supplier || undefined,
        itemType: promotion.itemType === "machine" ? "machine" : "product",
        maxQuantity: stock ?? undefined,
        promotionId: promotion.id,
        minQuantity: startQuantity,
        offerMinQuantity: promotion.min_quantity,
        normalPrice: promotion.normal_price,
        freeGiftName: freeProduct?.name,
      },
      startQuantity
    );
    setCartOpen(true);
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-orange-100 shadow-lg hover:shadow-xl hover:border-orange-300 transition-all duration-300 overflow-hidden flex flex-col ${className}`}
    >
      {isGiftOffer ? (
        <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md">
          <Gift className="w-3.5 h-3.5" />
          Cadeau
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold shadow-md">
          -{promotion.discountPercent}%
        </div>
      )}

      <Link href={productHref} className="block">
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
              {!isGiftOffer && (
                <span className="text-sm text-gray-400 line-through">
                  {promotion.normal_price.toLocaleString("fr-FR")} DA
                </span>
              )}
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
            href={catalogItemHref(promotion.itemType, freeProduct.id)}
            className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 hover:bg-emerald-100 transition-colors"
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

        <div className="mt-auto pt-3 border-t border-gray-100 space-y-2.5">
          {reservable && (
            <>
              {stockBelowMin && (
                <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                  Stock limité : il ne reste que {stock} unité{(stock as number) > 1 ? "s" : ""}{" "}
                  (minimum de l&apos;offre : {promotion.min_quantity}). L&apos;offre s&apos;applique
                  à la quantité restante.
                </p>
              )}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!ready || blockedForRole || outOfStock}
                className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md active:opacity-90 sm:hover:from-orange-600 sm:hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                {outOfStock
                  ? "Rupture de stock"
                  : ready && !role
                    ? "Se connecter pour profiter"
                    : "Ajouter au panier"}
              </button>
              {blockedForRole && (
                <p className="text-[11px] text-gray-500 text-center">
                  Offre réservée aux comptes laboratoire
                </p>
              )}
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Offre limitée</span>
            <Link
              href={productHref}
              className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:gap-2 transition-all"
            >
              {viewLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {cartOpen &&
        createPortal(
          <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />,
          document.body
        )}
    </div>
  );
}
