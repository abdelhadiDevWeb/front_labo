"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Users,
  Clock,
  Package,
  Loader2,
  ShoppingBag,
  Eye,
  X,
  Tag,
  MapPin,
  Truck,
  Calendar,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  getPublicGroupSelles,
  joinGroupSelle,
  GroupSelleItem,
  getSessionRole,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import UniqueDataFields from "@/components/UniqueDataFields";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";
import { getFicheTechniquePdfUrl } from "@/lib/fiche-technique-url";

function useCountdown(endTime: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const end = new Date(endTime).getTime();
    const diff = Math.max(0, end - now);
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { diff, days, hours, minutes, seconds, expired: diff <= 0 };
  }, [endTime, now]);
}

function formatDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR");
}

function JoinForm({
  item,
  onJoined,
  compact = false,
}: {
  item: GroupSelleItem;
  onJoined: () => void;
  compact?: boolean;
}) {
  const [qty, setQty] = useState("1");
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quantity = Math.max(0, Math.floor(Number(qty) || 0));
  const cost = quantity * item.price_by_one;
  const countdown = useCountdown(item.end_time);
  const { canSeePrice } = useCanSeeCatalogPrice();

  const handleJoin = async () => {
    setError(null);
    setMessage(null);

    const session = await getSessionRole();
    if (!session || session.role !== "client") {
      setError("Connectez-vous en tant que client pour participer");
      return;
    }

    if (quantity < 1) {
      setError("Indiquez une quantité ≥ 1");
      return;
    }
    if (quantity > item.remainingQuantity) {
      setError(`Maximum disponible : ${item.remainingQuantity}`);
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinGroupSelle(item.id, quantity);
      if (!result.success) {
        setError(result.message || "Participation impossible");
        return;
      }
      setMessage(
        result.message ||
          `Participation enregistrée — coût ${cost.toFixed(2)} DA`
      );
      setQty("1");
      onJoined();
    } finally {
      setIsJoining(false);
    }
  };

  if (countdown.expired || item.status !== "open") {
    return (
      <p className="text-sm text-gray-500 font-medium">Cette vente est terminée</p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <label className="block text-xs font-semibold text-gray-600">
        Quantité souhaitée
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          max={item.remainingQuantity}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
        />
        <div className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-800 whitespace-nowrap">
          {canSeePrice ? (
            `${cost.toFixed(2)} DA`
          ) : (
            <span className="text-xs font-medium text-gray-500">Prix masqué</span>
          )}
        </div>
      </div>
      <button
        type="button"
        disabled={isJoining || item.remainingQuantity < 1}
        onClick={handleJoin}
        className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isJoining ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingBag className="w-4 h-4" />
        )}
        Participer
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
      {error?.includes("Connectez-vous") && (
        <Link href="/login" className="text-xs text-teal-700 underline font-medium">
          Se connecter
        </Link>
      )}
    </div>
  );
}

function GroupSellDetailsModal({
  item,
  onClose,
  onJoined,
}: {
  item: GroupSelleItem;
  onClose: () => void;
  onJoined: () => void;
}) {
  const countdown = useCountdown(item.end_time);
  const product = item.product;
  const { canSeePrice } = useCanSeeCatalogPrice();
  const images = product?.images?.length
    ? product.images.map((src) => getMediaUrl(src)).filter(Boolean)
    : [];
  const [activeImage, setActiveImage] = useState(0);
  const [showPdf, setShowPdf] = useState(false);

  const fichePdfUrl = useMemo(
    () => getFicheTechniquePdfUrl(product?.unique_data),
    [product?.unique_data]
  );

  const location = [product?.wilaya, product?.daira, product?.commune]
    .filter(Boolean)
    .join(" · ");

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
          aria-labelledby="group-sell-details-title"
          className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 sm:p-5 border-b border-gray-200 sticky top-0 bg-white z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">
                Détails de la vente groupée
              </p>
              <h3
                id="group-sell-details-title"
                className="text-lg sm:text-xl font-bold text-gray-900"
              >
                {product?.name || "Produit"}
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
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-teal-50 to-emerald-100 border border-teal-100">
                  {images[activeImage] ? (
                    <img
                      src={images[activeImage]}
                      alt={product?.name || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-teal-300" />
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
                            ? "border-teal-500"
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

              <div className="space-y-4">
                <div>
                  {canSeePrice ? (
                    <>
                      <p className="text-2xl font-bold text-teal-700">
                        {item.price_by_one.toFixed(2)} DA
                        <span className="text-sm font-medium text-gray-500">
                          {" "}
                          / unité (groupée)
                        </span>
                      </p>
                      {typeof product?.sellingPrice === "number" &&
                        product.sellingPrice > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            Prix catalogue : {product.sellingPrice.toFixed(2)} DA
                          </p>
                        )}
                    </>
                  ) : (
                    <CatalogPrice
                      amount={item.price_by_one}
                      visible={false}
                      className="text-2xl font-bold text-teal-700"
                    />
                  )}
                </div>

                <div
                  className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2 ${
                    countdown.expired
                      ? "bg-gray-100 text-gray-600"
                      : "bg-teal-50 text-teal-800"
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  {countdown.expired ? (
                    <span>Terminé</span>
                  ) : (
                    <span>
                      Fin dans {countdown.days > 0 ? `${countdown.days}j ` : ""}
                      {String(countdown.hours).padStart(2, "0")}:
                      {String(countdown.minutes).padStart(2, "0")}:
                      {String(countdown.seconds).padStart(2, "0")}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      Progress {item.committedQuantity}/{item.qu}
                    </span>
                    <span className="font-semibold">{item.progressPercent}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Il reste <strong>{item.remainingQuantity}</strong> pour
                    atteindre l&apos;objectif
                  </p>
                </div>

                <JoinForm item={item} onJoined={onJoined} />
              </div>
            </div>

            <section>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Infos vente groupée
              </h4>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <DetailRow
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label="Quantité cible"
                  value={`${item.qu}`}
                />
                <DetailRow
                  icon={<ShoppingBag className="w-3.5 h-3.5" />}
                  label="Déjà réservé"
                  value={`${item.committedQuantity}`}
                />
                <DetailRow
                  icon={<Users className="w-3.5 h-3.5" />}
                  label="Participants"
                  value={`${item.users?.length || 0}`}
                />
                <DetailRow
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label="Total annoncé"
                  value={`${item.total.toFixed(2)} DA`}
                />
                <DetailRow
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Date de début"
                  value={formatDay(item.start_time)}
                />
                <DetailRow
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Date de fin"
                  value={formatDay(item.end_time)}
                />
                <DetailRow
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label="Statut"
                  value={item.status === "open" ? "Ouverte" : "Fermée"}
                />
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-600" />
                Infos produit
              </h4>
              <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
                <DetailRow
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  label="Marque"
                  value={product?.brand || "—"}
                />
                <DetailRow
                  icon={<Tag className="w-3.5 h-3.5" />}
                  label="Catégorie"
                  value={product?.category || "—"}
                />
                <DetailRow
                  icon={<Package className="w-3.5 h-3.5" />}
                  label="Stock fournisseur"
                  value={
                    product?.stockQuantity != null
                      ? String(product.stockQuantity)
                      : "—"
                  }
                />
                <DetailRow
                  icon={<Truck className="w-3.5 h-3.5" />}
                  label="Délai de livraison"
                  value={product?.deliveryTime || "—"}
                />
                {product?.productType && (
                  <DetailRow
                    icon={<Tag className="w-3.5 h-3.5" />}
                    label="Type"
                    value={product.productType}
                  />
                )}
                {product?.conditionnement && (
                  <DetailRow
                    icon={<Package className="w-3.5 h-3.5" />}
                    label="Conditionnement"
                    value={product.conditionnement}
                  />
                )}
                {location && (
                  <DetailRow
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    label="Localisation"
                    value={location}
                  />
                )}
              </div>
              {fichePdfUrl && (
                <button
                  type="button"
                  onClick={() => setShowPdf(true)}
                  className="mb-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Voir le PDF
                </button>
              )}
              {product?.unique_data && (
                <UniqueDataFields
                  data={product.unique_data}
                  max={20}
                  hidePrices={!canSeePrice}
                  excludeKeys={["Fiche Technique", "ficheTechnique", "fiche technique"]}
                />
              )}
              {product?.id && (
                <Link
                  href={`/products/${product.id}`}
                  className="inline-flex mt-3 text-sm font-semibold text-teal-700 hover:underline"
                >
                  Voir la fiche produit complète →
                </Link>
              )}
            </section>
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
                    {product?.name || "Produit"} — Fiche technique
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
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <span className="text-teal-600 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
          {label}
        </p>
        <p className="text-gray-900 font-semibold break-words">{value}</p>
      </div>
    </div>
  );
}

function GroupSellCard({
  item,
  onJoined,
  onSeeDetails,
}: {
  item: GroupSelleItem;
  onJoined: () => void;
  onSeeDetails: () => void;
}) {
  const countdown = useCountdown(item.end_time);
  const { canSeePrice } = useCanSeeCatalogPrice();
  const img = item.product?.images?.[0]
    ? getMediaUrl(item.product.images[0])
    : null;

  return (
    <div className="bg-white rounded-2xl border border-teal-100 shadow-lg overflow-hidden flex flex-col">
      <div className="relative h-44 bg-gradient-to-br from-teal-50 to-emerald-100">
        {img ? (
          <img
            src={img}
            alt={item.product?.name || ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-14 h-14 text-teal-300" />
          </div>
        )}
        <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-teal-800 shadow">
          Vente groupée
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
          {item.product?.name || "Produit"}
        </h3>
        {canSeePrice ? (
          <p className="text-xl font-bold text-teal-700">
            {item.price_by_one.toFixed(2)} DA
            <span className="text-sm font-medium text-gray-500"> / unité</span>
          </p>
        ) : (
          <CatalogPrice
            amount={item.price_by_one}
            visible={false}
            className="text-xl font-bold text-teal-700"
            lockedClassName="text-xs font-medium text-gray-500"
          />
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              Progress {item.committedQuantity}/{item.qu}
            </span>
            <span className="font-semibold">{item.progressPercent}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Il reste <strong>{item.remainingQuantity}</strong> pour atteindre
            l&apos;objectif
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-sm font-semibold rounded-xl px-3 py-2 ${
            countdown.expired
              ? "bg-gray-100 text-gray-600"
              : "bg-teal-50 text-teal-800"
          }`}
        >
          <Clock className="w-4 h-4 shrink-0" />
          {countdown.expired ? (
            <span>Terminé</span>
          ) : (
            <span>
              Fin dans {countdown.days > 0 ? `${countdown.days}j ` : ""}
              {String(countdown.hours).padStart(2, "0")}:
              {String(countdown.minutes).padStart(2, "0")}:
              {String(countdown.seconds).padStart(2, "0")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onSeeDetails}
          className="w-full py-2.5 border-2 border-teal-600 text-teal-700 rounded-xl font-semibold hover:bg-teal-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Voir détails
        </button>

        {!countdown.expired && item.status === "open" && (
          <div className="mt-auto pt-1">
            <JoinForm item={item} onJoined={onJoined} compact />
          </div>
        )}
      </div>
    </div>
  );
}

export default function GroupSelleShowcase() {
  const [items, setItems] = useState<GroupSelleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailsItem, setDetailsItem] = useState<GroupSelleItem | null>(null);

  const load = async () => {
    try {
      const result = await getPublicGroupSelles();
      if (result.success && result.data?.groupSelles) {
        const next = result.data.groupSelles;
        setItems(next);
        setDetailsItem((current) => {
          if (!current) return null;
          return next.find((g) => g.id === current.id) || null;
        });
      } else {
        setItems([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30000);
    return () => clearInterval(id);
  }, []);

  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <section
      id="group-sell-section"
      className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-teal-50 via-white to-white scroll-mt-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5" />
            Achats collectifs
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Users className="w-8 h-8 text-teal-600" />
            Ventes groupées
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto">
            Rejoignez une annonce, indiquez votre quantité — quand l&apos;objectif
            est atteint, la réserve est créée automatiquement
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {items.map((item) => (
            <GroupSellCard
              key={item.id}
              item={item}
              onJoined={() => void load()}
              onSeeDetails={() => setDetailsItem(item)}
            />
          ))}
        </div>
      </div>

      {detailsItem && (
        <GroupSellDetailsModal
          item={detailsItem}
          onClose={() => setDetailsItem(null)}
          onJoined={() => void load()}
        />
      )}
    </section>
  );
}
