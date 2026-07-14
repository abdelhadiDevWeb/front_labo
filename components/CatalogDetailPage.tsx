"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
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

function getFicheTechniquePdfUrl(
  data: Record<string, unknown> | null | undefined
): string | null {
  if (!data) return null;
  for (const key of Object.keys(data)) {
    if (!/fiche\s*technique/i.test(key) && key.toLowerCase() !== "fichetechnique") {
      continue;
    }
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return getMediaUrl(value.trim());
    }
  }
  return null;
}

export default function CatalogDetailPage({ kind }: { kind: "machine" | "service" }) {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const { addToCart } = useCart();
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
        <Link href={listHref} className="text-blue-600 font-semibold">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const image = item.images?.[0] ? getMediaUrl(item.images[0]) : null;

  const handleReserve = async () => {
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
    setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <Link href={listHref} className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600">
            <ArrowLeft className="w-4 h-4" />
            Retour aux {kind === "machine" ? "machines" : "services"}
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8 grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden aspect-square">
          {image ? (
            <img src={image} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <ImageIcon className="w-16 h-16 text-gray-300" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
              kind === "machine" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {label}
          </span>
          <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
          <p className="text-2xl font-bold text-blue-600">{item.price.toFixed(2)} DA</p>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{item.brand}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              <span>
                {item.category}
                {item.sousCategory ? ` / ${item.sousCategory}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{item.deliveryTime}</span>
            </div>
            {item.supplier && <p className="text-gray-500">Fournisseur : {item.supplier.name}</p>}
          </div>

          {kind === "machine" && (
            <button
              type="button"
              onClick={() => void handleReserve()}
              disabled={item.quantity === 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {item.quantity === 0 ? "Rupture de stock" : "Réserver"}
            </button>
          )}

          {fichePdfUrl && (
            <button
              type="button"
              onClick={() => setShowPdf(true)}
              className="w-full py-3 rounded-xl font-semibold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Voir la fiche technique
            </button>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Détails</h2>
            <UniqueDataFields
              data={item.unique_data}
              max={40}
              excludeKeys={["Fiche Technique", "ficheTechnique", "fiche technique"]}
              className="max-h-none"
            />
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
