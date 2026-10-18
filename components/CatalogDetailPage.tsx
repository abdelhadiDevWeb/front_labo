"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Tag,
  Clock,
  Loader2,
  Image as ImageIcon,
  Package,
  ShoppingCart,
  FileText,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import {
  PublicCatalogItem,
  getPublicMachineById,
  getPublicServiceById,
  getSessionRole,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { useCart } from "@/contexts/CartContext";
import CartPanel from "@/components/CartPanel";
import LoginAlert from "@/components/LoginAlert";
import UniqueDataFields from "@/components/UniqueDataFields";
import SupplierNameGate from "@/components/SupplierNameGate";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";
import BackButton from "@/components/BackButton";
import { getFicheTechniquePdfUrl } from "@/lib/fiche-technique-url";
import SupplierDeliveryNotes from "@/components/SupplierDeliveryNotes";
import QuantityInput from "@/components/QuantityInput";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveWilayaCode } from "@/lib/algeria-wilayas";

export default function CatalogDetailPage({ kind }: { kind: "machine" | "service" }) {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const { addToCart } = useCart();
  const { canSeePrice } = useCanSeeCatalogPrice();
  const { location } = useUserLocation();
  const visitorWilayaCode = resolveWilayaCode(location?.wilaya);
  const listHref = kind === "machine" ? "/machines" : "/services";
  const label = kind === "machine" ? "Machine" : "Service";

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      const result =
        kind === "machine" ? await getPublicMachineById(id) : await getPublicServiceById(id);
      if (result.success && result.data) {
        setItem(result.data);
      } else {
        setError(result.message || `${label} introuvable`);
      }
      setIsLoading(false);
    };
    void load();
  }, [id, kind, label]);

  const fichePdfUrl = useMemo(
    () => getFicheTechniquePdfUrl(item?.unique_data),
    [item?.unique_data]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Package className="w-14 h-14 text-gray-300" />
        <p className="text-gray-600">{error || `${label} introuvable`}</p>
        <BackButton
          fallbackHref={listHref}
          className="text-blue-600 font-semibold inline-flex items-center gap-2"
          label="Retour"
        />
      </div>
    );
  }

  const images = (item.images || []).map((path) => getMediaUrl(path)).filter(Boolean) as string[];
  const currentImage = images[Math.min(imageIndex, Math.max(0, images.length - 1))] || null;
  const stock = typeof item.quantity === "number" ? item.quantity : undefined;
  const outOfStock = item.quantity === 0;
  const isMachine = kind === "machine";
  const CARD = "bg-white rounded-2xl border border-gray-200 shadow-sm lg:shadow-lg p-4 sm:p-6";
  const mediaBox = "w-full aspect-square sm:aspect-auto sm:h-80 md:h-96";

  const handleReserve = async () => {
    const session = await getSessionRole();
    if (!session || session.role !== "client") {
      setLoginAlertOpen(true);
      return;
    }
    addToCart(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        supplierId: item.supplier?.id || "",
        itemType: "machine",
        maxQuantity: stock,
      },
      quantity
    );
    setCartOpen(true);
  };

  const supplierPhone = item.supplier?.phone;
  const showBottomBar = !canSeePrice || isMachine || Boolean(supplierPhone) || Boolean(fichePdfUrl);

  return (
    <div
      className={`min-h-screen bg-gray-50 lg:pb-0 ${
        showBottomBar ? "pb-[calc(6rem+var(--lab-nav-offset,0px))]" : "pb-[calc(1.5rem+var(--lab-nav-offset,0px))]"
      }`}
    >
      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl flex h-14 sm:h-16 items-center gap-1 px-2 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref={listHref}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 sm:px-3 text-gray-700 active:bg-gray-100 sm:hover:text-blue-600 transition-colors"
            iconClassName="w-5 h-5"
            label={<span className="hidden sm:inline">Retour</span>}
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 lg:hidden">
            {item.name}
          </p>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-0 sm:px-6 lg:px-8 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-3 sm:gap-8 lg:gap-12">
          {/* Media */}
          <div className="space-y-3 sm:space-y-4">
            <div className="relative bg-white sm:rounded-2xl sm:shadow-lg sm:border sm:border-gray-200 overflow-hidden">
              {currentImage ? (
                <img src={currentImage} alt={item.name} className={`${mediaBox} object-cover`} />
              ) : (
                <div className={`${mediaBox} flex items-center justify-center bg-gray-100`}>
                  <ImageIcon className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <span
                className={`absolute left-3 top-3 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold shadow-sm ${
                  isMachine ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
                }`}
              >
                {label}
              </span>
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Image précédente"
                    onClick={() => setImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md active:bg-white sm:bg-black/50 sm:text-white sm:hover:bg-black/70"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Image suivante"
                    onClick={() => setImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md active:bg-white sm:bg-black/50 sm:text-white sm:hover:bg-black/70"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/30 px-2 py-1">
                    {images.map((_, index) => (
                      <span
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === imageIndex ? "w-4 bg-white" : "w-2 bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-3 sm:px-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((src, index) => (
                  <button
                    type="button"
                    key={src + index}
                    onClick={() => setImageIndex(index)}
                    className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      index === imageIndex ? "border-blue-500" : "border-gray-200"
                    }`}
                  >
                    <img src={src} alt={`Miniature ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 sm:space-y-6 px-3 sm:px-0">
            {/* Title */}
            <div className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {canSeePrice && item.category ? (
                    <span className="mb-2 inline-flex px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] sm:text-xs font-semibold">
                      {item.category}
                      {item.sousCategory ? ` / ${item.sousCategory}` : ""}
                    </span>
                  ) : null}
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold leading-snug text-gray-900">
                    {item.name}
                  </h1>
                  {canSeePrice ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600 text-xs sm:text-sm">
                      {item.brand && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {item.brand}
                        </span>
                      )}
                      {item.deliveryTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {item.deliveryTime}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
                {canSeePrice && isMachine ? (
                  <span
                    className={`shrink-0 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-semibold ${
                      outOfStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {outOfStock ? "Rupture" : "En stock"}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <CatalogPrice
                  amount={item.price}
                  visible={canSeePrice}
                  className="text-2xl sm:text-3xl font-bold text-blue-600"
                />
              </div>
            </div>

            {canSeePrice && fichePdfUrl ? (
              <button
                type="button"
                onClick={() => setShowPdf(true)}
                className="w-full min-h-12 rounded-2xl font-semibold border-2 border-emerald-600 bg-white text-emerald-700 active:bg-emerald-50 sm:hover:bg-emerald-50 flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Voir la fiche technique
              </button>
            ) : null}

            {/* Details */}
            <div className={CARD}>
              <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Détails</h2>
              <UniqueDataFields
                data={item.unique_data}
                max={40}
                guestOnly={!canSeePrice}
                hidePrices={!canSeePrice}
                excludeKeys={["Fiche Technique", "ficheTechnique", "fiche technique"]}
                className="max-h-none"
              />
            </div>

            {/* Supplier */}
            {item.supplier && (
              <div className={CARD}>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Fournisseur
                </h2>
                <SupplierNameGate visible={canSeePrice}>
                  <div className="space-y-1">
                    <Link
                      href={`/supplier/${item.supplier.id}`}
                      className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50 sm:hover:bg-gray-50"
                    >
                      <Building2 className="w-5 h-5 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Nom</p>
                        <p className="truncate font-semibold text-gray-900">{item.supplier.name}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </Link>
                    {item.supplier.email && (
                      <a
                        href={`mailto:${item.supplier.email}`}
                        className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50"
                      >
                        <Mail className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="truncate font-semibold text-gray-900">{item.supplier.email}</p>
                        </div>
                      </a>
                    )}
                    {supplierPhone && (
                      <a
                        href={`tel:${supplierPhone}`}
                        className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50"
                      >
                        <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Téléphone</p>
                          <p className="font-semibold text-gray-900">{supplierPhone}</p>
                        </div>
                      </a>
                    )}
                    {item.supplier.address && (
                      <div className="flex items-center gap-3 p-2">
                        <MapPin className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Adresse</p>
                          <p className="font-semibold text-gray-900">{item.supplier.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </SupplierNameGate>
              </div>
            )}

            {canSeePrice && item.supplier ? (
              <div className={CARD}>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Livraison</h2>
                <SupplierDeliveryNotes
                  deliveryNoteAll={item.supplier.deliveryNoteAll}
                  deliveryByWilaya={item.supplier.deliveryByWilaya}
                  wilayas={item.supplier.wilayas}
                  coversAllWilayas={item.supplier.coversAllWilayas}
                  highlightWilayaCode={visitorWilayaCode}
                />
              </div>
            ) : null}

            {/* Reserve — desktop (phone uses the bottom bar) */}
            {canSeePrice && isMachine ? (
              <div className={`${CARD} hidden lg:block space-y-4`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                  <QuantityInput value={quantity} onChange={setQuantity} max={stock} disabled={outOfStock} />
                  {stock !== undefined && stock > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {stock} disponible{stock > 1 ? "s" : ""}
                      {quantity >= stock && " — quantité maximale atteinte"}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleReserve()}
                  disabled={outOfStock}
                  className="w-full py-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {outOfStock ? "Rupture de stock" : "Réserver"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Phone action bar */}
      {showBottomBar && (
        <div className="app-action-bar fixed inset-x-0 z-30 border-t border-gray-200 bg-white/95 px-3 pt-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden">
          {!canSeePrice ? (
            <Link
              href="/login"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-md active:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              Se connecter pour voir le prix et réserver
            </Link>
          ) : isMachine ? (
            <div className="flex items-center gap-2.5">
              <QuantityInput size="sm" value={quantity} onChange={setQuantity} max={stock} disabled={outOfStock} />
              <button
                type="button"
                onClick={() => void handleReserve()}
                disabled={outOfStock}
                className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 text-sm font-semibold text-white shadow-md active:opacity-90 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {outOfStock ? "Rupture de stock" : "Réserver"}
              </button>
            </div>
          ) : supplierPhone ? (
            <a
              href={`tel:${supplierPhone}`}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-semibold text-white shadow-md active:opacity-90"
            >
              <Phone className="h-4 w-4" />
              Appeler le fournisseur
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setShowPdf(true)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 text-sm font-semibold text-emerald-700 active:bg-emerald-50"
            >
              <FileText className="h-4 w-4" />
              Voir la fiche technique
            </button>
          )}
        </div>
      )}

      {showPdf && fichePdfUrl && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowPdf(false)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6">
            <div
              className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-4xl h-full sm:h-[85vh] flex flex-col overflow-hidden"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-white shrink-0" />
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">
                    {item.name} — Fiche technique
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={fichePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="hidden sm:inline">Nouvel onglet</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowPdf(false)}
                    className="inline-flex h-10 w-10 items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <iframe src={fichePdfUrl} title="Fiche technique" className="flex-1 w-full border-0" />
            </div>
          </div>
        </>
      )}

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
