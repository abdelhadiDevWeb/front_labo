"use client";

import { useEffect, useState } from "react";
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

export default function CatalogDetailPage({ kind }: { kind: "machine" | "service" }) {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
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
  const extraEntries = Object.entries(item.unique_data || {}).filter(
    ([key, value]) =>
      !["images", "video"].includes(key) &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !Array.isArray(value)
  );

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

          {extraEntries.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Détails</h2>
              <dl className="space-y-2">
                {extraEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 text-sm border-b border-gray-50 pb-2">
                    <dt className="text-gray-500">{key}</dt>
                    <dd className="text-gray-900 text-right font-medium">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
