"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  X,
  Package,
  Building2,
  Tag,
  Clock,
  FileText,
  ExternalLink,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import { PublicCatalogItem, getSessionRole } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import UniqueDataFields from "@/components/UniqueDataFields";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";
import { isFicheTechniqueField } from "@/lib/catalog-form-fields";
import { useCart } from "@/contexts/CartContext";
import LoginAlert from "@/components/LoginAlert";

function isFicheTechniquePdfValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    /\.pdf($|\?)/i.test(trimmed) ||
    /uploads\/.*docs?\//i.test(trimmed) ||
    /uploads\/pdf\//i.test(trimmed)
  );
}

function getFicheTechniquePdfUrl(
  uniqueData: Record<string, unknown> | null | undefined
): string | null {
  if (!uniqueData) return null;
  for (const [key, value] of Object.entries(uniqueData)) {
    if (isFicheTechniqueField(key) && isFicheTechniquePdfValue(value)) {
      return getMediaUrl(String(value));
    }
  }
  return null;
}

export default function CatalogItemDetailsModal({
  item,
  kind,
  onClose,
  onReserved,
}: {
  item: PublicCatalogItem;
  kind: "machine" | "service";
  onClose: () => void;
  onReserved?: () => void;
}) {
  const label = kind === "machine" ? "Machine" : "Service";
  const detailHref =
    kind === "machine" ? `/machines/${item.id}` : `/services/${item.id}`;
  const accent =
    kind === "machine"
      ? {
          badge: "bg-blue-100 text-blue-700",
          button: "bg-emerald-600 hover:bg-emerald-700",
          ring: "border-blue-100 from-blue-50 to-cyan-100",
        }
      : {
          badge: "bg-amber-100 text-amber-800",
          button: "bg-emerald-600 hover:bg-emerald-700",
          ring: "border-amber-100 from-amber-50 to-orange-100",
        };

  const images = item.images?.length
    ? item.images.map((src) => getMediaUrl(src)).filter(Boolean)
    : [];
  const [activeImage, setActiveImage] = useState(0);
  const [showPdf, setShowPdf] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const { addToCart } = useCart();
  const { canSeePrice } = useCanSeeCatalogPrice();

  const fichePdfUrl = useMemo(
    () => getFicheTechniquePdfUrl(item.unique_data),
    [item.unique_data]
  );

  const handleReserve = async () => {
    if (kind !== "machine") return;
    const session = await getSessionRole();
    if (!session || session.role !== "client") {
      setLoginAlertOpen(true);
      return;
    }
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      supplierId: item.supplier?.id || "",
      itemType: "machine",
    });
    onReserved?.();
    onClose();
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showPdf) {
        setShowPdf(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, showPdf]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-start justify-between gap-3">
            <div>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${accent.badge}`}
              >
                {label}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {item.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <div
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br ${accent.ring} border`}
                >
                  {images[activeImage] ? (
                    <img
                      src={images[activeImage]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                    {images.map((src, i) => (
                      <button
                        key={src + i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${
                          i === activeImage
                            ? "border-blue-500"
                            : "border-transparent opacity-80"
                        }`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <CatalogPrice
                  amount={item.price}
                  visible={canSeePrice}
                  className="text-2xl font-bold text-blue-600"
                />

                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>{item.brand || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>
                      {item.category || "—"}
                      {item.sousCategory ? ` / ${item.sousCategory}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{item.deliveryTime || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span>Stock : {item.quantity ?? "—"}</span>
                  </div>
                  {item.supplier && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{item.supplier.name}</span>
                    </div>
                  )}
                </div>

                {fichePdfUrl && (
                  <button
                    type="button"
                    onClick={() => setShowPdf(true)}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${accent.button}`}
                  >
                    <FileText className="w-4 h-4" />
                    Voir le PDF
                  </button>
                )}

                {kind === "machine" && (
                  <button
                    type="button"
                    onClick={() => void handleReserve()}
                    disabled={item.quantity === 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {item.quantity === 0 ? "Rupture de stock" : "Réserver"}
                  </button>
                )}

                <Link
                  href={detailHref}
                  className="block w-full text-center py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ouvrir la fiche complète
                </Link>
              </div>
            </div>

            {item.unique_data && (
              <section>
                <h4 className="text-sm font-bold text-gray-900 mb-3">
                  Détails {label.toLowerCase()}
                </h4>
                <UniqueDataFields
                  data={item.unique_data}
                  max={30}
                  hidePrices={!canSeePrice}
                  excludeKeys={[
                    "Fiche Technique",
                    "ficheTechnique",
                    "fiche technique",
                  ]}
                />
              </section>
            )}
          </div>
        </div>
      </div>

      {showPdf && fichePdfUrl && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowPdf(false)}
            aria-hidden
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-white shrink-0" />
                  <h3 className="text-lg font-bold text-white truncate">
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
                    Nouvel onglet
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowPdf(false)}
                    className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-100 min-h-0">
                <iframe
                  src={fichePdfUrl}
                  title="Fiche technique PDF"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <LoginAlert
        isOpen={loginAlertOpen}
        onClose={() => setLoginAlertOpen(false)}
      />
    </>
  );
}
