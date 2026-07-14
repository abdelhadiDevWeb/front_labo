"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Package,
  Filter,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  Clock,
  Plus,
  Loader2,
  AlertCircle,
  Megaphone,
  CheckCircle,
  X,
  CreditCard,
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Crown,
  FileText,
  ExternalLink,
  FlaskConical,
  Layers,
} from "lucide-react";
import {
  getSupplierProducts,
  getSupplierMachines,
  getSupplierServices,
  getPublicCategories,
  Product,
  UniqueDataItem,
  Category,
  getSponsorPlans,
  getSupplierSponsorProducts,
  createSponsorProduct,
  createSubscriptionSponsorProduct,
  SponsorPlan,
  SponsorProductRecord,
  SubscriptionSponsorQuota,
  verifySponsorProductPayment,
  resumeSponsorPayment,
} from "@/lib/api";
import { validateCheckoutUrl } from "@/lib/security";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getMediaUrl } from "@/lib/media-url";
import { isFicheTechniqueField } from "@/lib/catalog-form-fields";
import { LABO_TYPE_OPTIONS, type LaboTypeValue } from "@/lib/labo-types";

type MarketplaceKind = "product" | "machine" | "service";

interface MarketplaceItem {
  id: string;
  kind: MarketplaceKind;
  unique_data: Record<string, unknown>;
  images: string[];
  video?: string;
  id_catgory?: string | null;
  id_sous_catgory?: string | null;
}

const kindToCategoryType = (kind: MarketplaceKind): Category["type_catgory"] =>
  kind === "service" ? "services" : kind;

const TITLE_KEYS = ["Désignation", "designation", "name", "nom", "Nom"];
const HIDDEN_UNIQUE_KEYS = new Set([
  "images",
  "video",
  "latitude",
  "longitude",
  "wilaya",
  "daira",
  "commune",
]);

const pickStr = (data: Record<string, unknown>, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  const lower = new Map(
    Object.entries(data).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const key of keys) {
    const value = lower.get(key.toLowerCase().trim());
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
};

const getItemTitle = (item: MarketplaceItem): string => {
  const fromData = pickStr(item.unique_data, TITLE_KEYS);
  if (fromData) return fromData;
  return item.kind === "machine" ? "Machine" : item.kind === "service" ? "Service" : "Produit";
};

const getUniqueDataEntries = (data: Record<string, unknown>) =>
  Object.entries(data).filter(([key, value]) => {
    if (HIDDEN_UNIQUE_KEYS.has(key)) return false;
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return false;
    if (typeof value === "object") return false;
    return true;
  });

const formatUniqueValue = (value: unknown): string => {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value);
};

/** True when unique_data value looks like an uploaded PDF path/URL */
const isFicheTechniquePdfValue = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    /\.pdf($|\?)/i.test(trimmed) ||
    /uploads\/.*docs?\//i.test(trimmed) ||
    /uploads\/pdf\//i.test(trimmed)
  );
};

const getItemImages = (data: Record<string, unknown>): string[] =>
  Array.isArray(data.images) ? (data.images as string[]).filter(Boolean) : [];

const getItemCategory = (item: MarketplaceItem): string =>
  pickStr(item.unique_data, ["Catégorie", "category", "categorie"]);

const getItemSousCategory = (item: MarketplaceItem): string =>
  pickStr(item.unique_data, [
    "Sous catégorie",
    "sous categorie",
    "sousCategory",
    "Sous-catégorie",
  ]);

const getItemLaboType = (item: MarketplaceItem): string =>
  pickStr(item.unique_data, ["type_labo", "productType", "type", "Type"]);

const uniqueDataToItem = (item: UniqueDataItem, kind: "machine" | "service"): MarketplaceItem => {
  const d = item.unique_data || {};
  return {
    id: String(item.id),
    kind,
    unique_data: d,
    images: getItemImages(d),
    video: pickStr(d, ["video"]) || undefined,
    id_catgory: item.id_catgory || null,
    id_sous_catgory: item.id_sous_catgory || null,
  };
};

const productToItem = (product: Product): MarketplaceItem => {
  const d: Record<string, unknown> = {
    ...(product.unique_data || {}),
  };
  // Keep flat API fields if unique_data is missing some keys
  if (!d.name && product.name) d.name = product.name;
  if (!d.brand && product.brand) d.brand = product.brand;
  if (!d.Catégorie && !d.category && product.category) d.Catégorie = product.category;
  if (d.purchasePrice === undefined && product.purchasePrice != null) {
    d.purchasePrice = product.purchasePrice;
  }
  if (d.sellingPrice === undefined && product.sellingPrice != null) {
    d.sellingPrice = product.sellingPrice;
  }
  if (d.quantity === undefined && product.quantity != null) d.quantity = product.quantity;
  if (!d.deliveryTime && product.deliveryTime) d.deliveryTime = product.deliveryTime;
  if (!d.productType && product.productType) d.productType = product.productType;
  if (!d.type_labo && product.productType) d.type_labo = product.productType;
  if (!Array.isArray(d.images) && product.images?.length) d.images = product.images;
  if (!d.video && product.video) d.video = product.video;

  return {
    id: product.id,
    kind: "product",
    unique_data: d,
    images: getItemImages(d),
    video: pickStr(d, ["video"]) || product.video,
    id_catgory: product.id_catgory || null,
    id_sous_catgory: product.id_sous_catgory || null,
  };
};

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isChecking } = useAuthGuard();
  const [products, setProducts] = useState<Product[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSousCategory, setFilterSousCategory] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<"all" | MarketplaceKind>("all");
  const [filterType, setFilterType] = useState<"all" | LaboTypeValue>("all");
  const [catalogCategories, setCatalogCategories] = useState<Category[]>([]);
  const [sponsorPlans, setSponsorPlans] = useState<SponsorPlan[]>([]);
  const [sponsorProducts, setSponsorProducts] = useState<SponsorProductRecord[]>([]);
  const [subscriptionQuota, setSubscriptionQuota] = useState<SubscriptionSponsorQuota | null>(null);
  const [activeProductIds, setActiveProductIds] = useState<string[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(new Set());
  const [isLoadingSponsor, setIsLoadingSponsor] = useState(true);
  const [showVipSponsorModal, setShowVipSponsorModal] = useState(false);
  const [showSubscriptionSponsorModal, setShowSubscriptionSponsorModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSubscriptionProductId, setSelectedSubscriptionProductId] = useState("");
  const [isCreatingSponsor, setIsCreatingSponsor] = useState(false);
  const [isCreatingSubscriptionSponsor, setIsCreatingSubscriptionSponsor] = useState(false);
  const [resumingPaymentId, setResumingPaymentId] = useState<string | null>(null);
  const [sponsorSuccess, setSponsorSuccess] = useState<string | null>(null);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [fichePdfViewer, setFichePdfViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const loadSponsorData = async () => {
    setIsLoadingSponsor(true);
    try {
      const [plansResult, sponsorResult] = await Promise.all([
        getSponsorPlans(),
        getSupplierSponsorProducts(),
      ]);
      if (plansResult.success && plansResult.data) {
        setSponsorPlans(plansResult.data.plans);
      }
      if (sponsorResult.success && sponsorResult.data) {
        setSponsorProducts(sponsorResult.data.sponsorProducts);
        if (sponsorResult.data.subscriptionQuota) {
          setSubscriptionQuota(sponsorResult.data.subscriptionQuota);
        }
        const fromApi = sponsorResult.data.activeProductIds;
        if (fromApi?.length) {
          setActiveProductIds(fromApi);
        } else {
          setActiveProductIds([
            ...new Set(
              sponsorResult.data.sponsorProducts
                .filter(
                  (s) =>
                    s.isActive ||
                    (s.payment_status && new Date(s.end_time) > new Date())
                )
                .map((s) => s.id_product)
            ),
          ]);
        }
      }
    } catch {
      setSponsorError("Erreur lors du chargement des données sponsor");
    } finally {
      setIsLoadingSponsor(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    const init = async () => {
      try {
        setIsLoading(true);
        const [productsResult, machinesResult, servicesResult, categoriesResult] =
          await Promise.all([
            getSupplierProducts(),
            getSupplierMachines(),
            getSupplierServices(),
            getPublicCategories(),
          ]);

        const loadedProducts =
          productsResult.success && productsResult.data ? productsResult.data.products || [] : [];
        const loadedMachines =
          machinesResult.success && machinesResult.data ? machinesResult.data.machines || [] : [];
        const loadedServices =
          servicesResult.success && servicesResult.data ? servicesResult.data.services || [] : [];

        setProducts(loadedProducts);
        setMarketplaceItems([
          ...loadedProducts.map(productToItem),
          ...loadedMachines.map((m) => uniqueDataToItem(m, "machine")),
          ...loadedServices.map((s) => uniqueDataToItem(s, "service")),
        ]);

        if (categoriesResult.success && categoriesResult.data?.categories) {
          setCatalogCategories(categoriesResult.data.categories);
        }

        if (!productsResult.success && !machinesResult.success && !servicesResult.success) {
          setError(
            productsResult.message ||
              machinesResult.message ||
              servicesResult.message ||
              "Erreur lors du chargement du MarketPlace"
          );
        }
      } catch (err) {
        setError("Une erreur est survenue");
        console.error("Load marketplace error:", err);
      } finally {
        setIsLoading(false);
      }

      const sponsorParam = searchParams.get("sponsor");
      const ref = searchParams.get("ref");

      if (sponsorParam === "success" && ref) {
        const verifyResult = await verifySponsorProductPayment(ref);
        if (verifyResult.success && verifyResult.data?.paid) {
          setSponsorSuccess("Paiement confirmé ! Votre produit est maintenant sponsorisé.");
        } else {
          setSponsorSuccess("Paiement réussi ! Confirmation en cours...");
        }
      } else if (sponsorParam === "success") {
        setSponsorSuccess("Paiement réussi ! Votre sponsoring sera activé sous peu.");
      } else if (sponsorParam === "failed") {
        setSponsorError("Le paiement a échoué ou a été annulé.");
      }

      await loadSponsorData();
    };

    void init();
  }, [router, searchParams]);

  const handleCompletePayment = async (sponsorProductId: string) => {
    setResumingPaymentId(sponsorProductId);
    setSponsorError(null);

    try {
      const result = await resumeSponsorPayment(sponsorProductId);

      if (result.success && result.data?.paid) {
        setSponsorSuccess("Paiement déjà confirmé !");
        await loadSponsorData();
        return;
      }

      if (result.success && result.data?.checkoutUrl) {
        const safeUrl = validateCheckoutUrl(result.data.checkoutUrl);
        if (!safeUrl) {
          setSponsorError("URL de paiement invalide");
          return;
        }
        window.location.href = safeUrl;
        return;
      }

      setSponsorError(result.message || "Impossible de reprendre le paiement");
    } catch {
      setSponsorError("Une erreur est survenue lors de la reprise du paiement");
    } finally {
      setResumingPaymentId(null);
    }
  };

  const handleCreateSubscriptionSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubscriptionProductId) return;

    setIsCreatingSubscriptionSponsor(true);
    setSponsorError(null);
    setSponsorSuccess(null);

    try {
      const result = await createSubscriptionSponsorProduct({
        id_product: selectedSubscriptionProductId,
      });

      if (result.success) {
        setSponsorSuccess("Sponsoring activé via votre abonnement (sans paiement) !");
        setShowSubscriptionSponsorModal(false);
        if (result.data?.quota) {
          setSubscriptionQuota(result.data.quota);
        }
        await loadSponsorData();
        return;
      }

      setSponsorError(result.message || "Impossible de créer le sponsoring");
    } catch {
      setSponsorError("Une erreur est survenue");
    } finally {
      setIsCreatingSubscriptionSponsor(false);
    }
  };

  const handleCreateSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !selectedProductId) return;

    setIsCreatingSponsor(true);
    setSponsorError(null);
    setSponsorSuccess(null);

    try {
      const result = await createSponsorProduct({
        id_plan_sponsor: selectedPlanId,
        id_product: selectedProductId,
      });

      if (result.success && result.data?.checkoutUrl) {
        const safeUrl = validateCheckoutUrl(result.data.checkoutUrl);
        if (!safeUrl) {
          setSponsorError("URL de paiement invalide");
          return;
        }
        window.location.href = safeUrl;
        return;
      }

      setSponsorError(result.message || "Impossible de créer le sponsoring");
    } catch {
      setSponsorError("Une erreur est survenue");
    } finally {
      setIsCreatingSponsor(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getSponsorStatus = (record: SponsorProductRecord) => {
    if (record.source === "subscription" && record.payment_status) {
      return { label: "Abonnement", className: "bg-blue-100 text-blue-800" };
    }
    if (record.isActive) {
      return { label: "Actif", className: "bg-green-100 text-green-800" };
    }
    if (!record.payment_status) {
      return { label: "En attente de paiement", className: "bg-amber-100 text-amber-800" };
    }
    if (new Date(record.end_time) > new Date()) {
      return { label: "Actif", className: "bg-green-100 text-green-800" };
    }
    return { label: "Expiré", className: "bg-gray-100 text-gray-700" };
  };

  const activeProductIdSet = useMemo(() => new Set(activeProductIds), [activeProductIds]);

  const pendingSponsorProducts = useMemo(
    () =>
      sponsorProducts.filter(
        (record) => !record.payment_status && (record.source ?? "vip") === "vip"
      ),
    [sponsorProducts]
  );

  const pendingProductIdSet = useMemo(
    () => new Set(pendingSponsorProducts.map((record) => record.id_product)),
    [pendingSponsorProducts]
  );

  const productsAvailableForSponsor = useMemo(
    () =>
      products.filter(
        (product) => !activeProductIdSet.has(product.id) && !pendingProductIdSet.has(product.id)
      ),
    [products, activeProductIdSet, pendingProductIdSet]
  );

  const sponsorHistoryByProduct = useMemo(() => {
    const grouped = new Map<
      string,
      { productId: string; productName: string; productImage?: string; history: SponsorProductRecord[] }
    >();

    for (const record of sponsorProducts) {
      const productId = record.id_product;
      const existing = grouped.get(productId);
      if (existing) {
        existing.history.push(record);
      } else {
        grouped.set(productId, {
          productId,
          productName: record.product?.name || "Produit",
          productImage: record.product?.images?.[0],
          history: [record],
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName, "fr")
    );
  }, [sponsorProducts]);

  const getActiveSponsorForProduct = (productId: string) =>
    sponsorProducts.find((record) => record.id_product === productId && record.isActive);

  const getPendingSponsorForProduct = (productId: string) =>
    pendingSponsorProducts.find((record) => record.id_product === productId);

  const toggleHistoryExpand = (productId: string) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const openVipSponsorModal = () => {
    setSelectedPlanId(sponsorPlans[0]?.id || "");
    setSelectedProductId(productsAvailableForSponsor[0]?.id || "");
    setSponsorError(null);
    setShowVipSponsorModal(true);
  };

  const openSubscriptionSponsorModal = () => {
    setSelectedSubscriptionProductId(productsAvailableForSponsor[0]?.id || "");
    setSponsorError(null);
    setShowSubscriptionSponsorModal(true);
  };

  // Categories available for the selected kind
  const filterableCategories = useMemo(() => {
    if (filterKind === "all") return [] as Category[];
    const type = kindToCategoryType(filterKind);
    return catalogCategories
      .filter((c) => (c.type_catgory || "product") === type)
      .sort((a, b) => a.name_catgory.localeCompare(b.name_catgory, "fr"));
  }, [catalogCategories, filterKind]);

  const selectedFilterCategory = filterableCategories.find((c) => c.id === filterCategory);
  const filterableSousCategories = selectedFilterCategory?.sousCategories ?? [];

  const handleFilterKindChange = (value: "all" | MarketplaceKind) => {
    setFilterKind(value);
    setFilterCategory("all");
    setFilterSousCategory("all");
    setFilterType("all");
  };

  const handleFilterCategoryChange = (value: string) => {
    setFilterCategory(value);
    setFilterSousCategory("all");
  };

  const filteredItems = marketplaceItems.filter((item) => {
    const matchesKind = filterKind === "all" || item.kind === filterKind;

    let matchesCategory = true;
    if (filterKind !== "all" && filterCategory !== "all") {
      const cat = selectedFilterCategory;
      matchesCategory = cat
        ? item.id_catgory === cat.id || getItemCategory(item) === cat.name_catgory
        : getItemCategory(item) === filterCategory;
    }

    let matchesSousCategory = true;
    if (filterKind !== "all" && filterSousCategory !== "all") {
      const sous = filterableSousCategories.find((s) => s.id === filterSousCategory);
      matchesSousCategory = sous
        ? item.id_sous_catgory === sous.id ||
          getItemSousCategory(item) === sous.name_sou_catgory
        : getItemSousCategory(item) === filterSousCategory;
    }

    const matchesType =
      filterType === "all" ||
      item.kind !== "product" ||
      getItemLaboType(item) === filterType;

    return matchesKind && matchesCategory && matchesSousCategory && matchesType;
  });

  const kindCounts = {
    all: marketplaceItems.length,
    product: marketplaceItems.filter((i) => i.kind === "product").length,
    machine: marketplaceItems.filter((i) => i.kind === "machine").length,
    service: marketplaceItems.filter((i) => i.kind === "service").length,
  };

  const kindLabel = (kind: MarketplaceKind) =>
    kind === "product" ? "Produit" : kind === "machine" ? "Machine" : "Service";

  const kindBadgeClass = (kind: MarketplaceKind) =>
    kind === "product"
      ? "bg-green-100 text-green-700"
      : kind === "machine"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-800";

  const kindSectionClass = (kind: MarketplaceKind) =>
    kind === "product"
      ? "border-green-200"
      : kind === "machine"
        ? "border-blue-200"
        : "border-amber-200";

  const sectionsToShow: MarketplaceKind[] =
    filterKind === "all" ? ["product", "machine", "service"] : [filterKind];

  const renderMarketplaceCard = (item: MarketplaceItem) => {
    const title = getItemTitle(item);
    const entries = getUniqueDataEntries(item.unique_data);
    const activeSponsor =
      item.kind === "product" ? getActiveSponsorForProduct(item.id) : undefined;
    const pendingSponsor =
      item.kind === "product" ? getPendingSponsorForProduct(item.id) : undefined;
    const itemKey = `${item.kind}-${item.id}`;
    const mainImage =
      item.images && item.images.length > 0 ? getMediaUrl(item.images[0]) : null;

    return (
      <div
        key={itemKey}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
      >
        <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          {mainImage && !failedImageIds.has(itemKey) ? (
            <img
              src={mainImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={() => {
                setFailedImageIds((prev) => new Set(prev).add(itemKey));
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-14 h-14 text-gray-400" />
            </div>
          )}
          <span
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${kindBadgeClass(item.kind)}`}
          >
            {kindLabel(item.kind)}
          </span>
          {activeSponsor && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold flex items-center gap-1">
              <Megaphone className="w-3 h-3" />
              Sponsorisé
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{title}</h3>

          <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
            {entries.length === 0 ? (
              <p className="text-xs text-gray-500">Aucune donnée dans unique_data</p>
            ) : (
              entries.map(([key, value]) => {
                const isFiche =
                  isFicheTechniqueField(key) && isFicheTechniquePdfValue(value);
                const pdfUrl = isFiche ? getMediaUrl(String(value)) : "";

                return (
                  <div
                    key={key}
                    className="flex justify-between gap-3 text-sm border-b border-gray-100 last:border-0 pb-1.5 last:pb-0 items-center"
                  >
                    <span className="text-gray-500 font-medium shrink-0">{key}</span>
                    {isFiche && pdfUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setFichePdfViewer({
                            url: pdfUrl,
                            title: `${title} — Fiche technique`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Voir le PDF
                      </button>
                    ) : isFicheTechniqueField(key) && !pdfUrl ? (
                      <span className="text-gray-400 text-xs italic">Non disponible</span>
                    ) : (
                      <span className="text-gray-900 text-right break-all font-semibold">
                        {formatUniqueValue(value)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {item.images.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ImageIcon className="w-3.5 h-3.5" />
              {item.images.length} image{item.images.length > 1 ? "s" : ""}
            </div>
          )}

          {activeSponsor && (
            <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              Sponsoring actif jusqu&apos;au {formatDate(activeSponsor.end_time)}
            </p>
          )}
          {pendingSponsor && !activeSponsor && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-900 mb-2">
                Paiement en attente — {pendingSponsor.price.toLocaleString("fr-FR")} DA
              </p>
              <button
                type="button"
                onClick={() => void handleCompletePayment(pendingSponsor.id)}
                disabled={resumingPaymentId === pendingSponsor.id}
                className="w-full px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resumingPaymentId === pendingSponsor.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Compléter le paiement
              </button>
            </div>
          )}

          {item.kind === "product" && (
            <button
              type="button"
              onClick={() => router.push(`/dashboard-supplier/products/${item.id}`)}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Voir les détails
            </button>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du MarketPlace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MarketPlace</h1>
          <p className="text-gray-600 mt-1">
            {marketplaceItems.length} élément{marketplaceItems.length > 1 ? "s" : ""} —{" "}
            {kindCounts.product} produit{kindCounts.product > 1 ? "s" : ""},{" "}
            {kindCounts.machine} machine{kindCounts.machine > 1 ? "s" : ""},{" "}
            {kindCounts.service} service{kindCounts.service > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard-supplier/add-product")}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterKind}
              onChange={(e) =>
                handleFilterKindChange(e.target.value as "all" | MarketplaceKind)
              }
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer"
            >
              <option value="all">Tous ({kindCounts.all})</option>
              <option value="product">Produits ({kindCounts.product})</option>
              <option value="machine">Machines ({kindCounts.machine})</option>
              <option value="service">Services ({kindCounts.service})</option>
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => handleFilterCategoryChange(e.target.value)}
              disabled={filterKind === "all"}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <option value="all">
                {filterKind === "all"
                  ? "Choisir un type d'abord"
                  : "Toutes les catégories"}
              </option>
              {filterableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_catgory}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterSousCategory}
              onChange={(e) => setFilterSousCategory(e.target.value)}
              disabled={filterKind === "all" || filterCategory === "all"}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <option value="all">
                {filterCategory === "all"
                  ? "Choisir une catégorie d'abord"
                  : filterableSousCategories.length === 0
                    ? "Aucune sous-catégorie"
                    : "Toutes les sous-catégories"}
              </option>
              {filterableSousCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name_sou_catgory}
                </option>
              ))}
            </select>
          </div>

          {filterKind === "product" && (
            <div className="relative">
              <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as "all" | LaboTypeValue)
                }
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer"
              >
                <option value="all">Tous les types de laboratoire</option>
                {LABO_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {filterKind === "all" && (
          <p className="text-xs text-gray-500 mt-3">
            Sélectionnez Produits, Machines ou Services pour filtrer par catégorie et
            sous-catégorie.
          </p>
        )}
      </div>

      {/* Separate sections: Product / Machine / Service */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {marketplaceItems.length === 0 ? "MarketPlace vide" : "Aucun résultat"}
          </h3>
          <p className="text-gray-600 mb-6">
            {marketplaceItems.length === 0
              ? "Ajoutez des produits, machines ou services pour les voir ici"
              : "Essayez de modifier vos filtres de recherche"}
          </p>
          {marketplaceItems.length === 0 && (
            <button
              onClick={() => router.push("/dashboard-supplier/add-product")}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Ajouter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {sectionsToShow.map((kind) => {
            const sectionItems = filteredItems.filter((item) => item.kind === kind);
            if (sectionItems.length === 0) return null;
            return (
              <section
                key={kind}
                className={`bg-white rounded-2xl border-2 ${kindSectionClass(kind)} p-4 sm:p-6 space-y-4`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${kindBadgeClass(kind)}`}>
                      {kindLabel(kind)}
                    </span>
                    <span className="text-gray-500 text-base font-medium">
                      ({sectionItems.length})
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {sectionItems.map((item) => renderMarketplaceCard(item))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Sponsor Sections */}
      <div className="space-y-6">
        {sponsorSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800">
            <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{sponsorSuccess}</p>
          </div>
        )}

        {sponsorError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{sponsorError}</p>
          </div>
        )}

        {/* Subscription sponsor (included in abonnement) */}
        <div className="bg-white rounded-2xl shadow-lg border border-blue-200 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Sponsoring abonnement
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Utilisez les sponsors inclus dans votre abonnement actif (sans paiement)
              </p>
            </div>
            <button
              onClick={openSubscriptionSponsorModal}
              disabled={
                products.length === 0 ||
                productsAvailableForSponsor.length === 0 ||
                !subscriptionQuota?.canCreateSubscriptionSponsor
              }
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Sponsoriser (abonnement)
            </button>
          </div>

          {isLoadingSponsor ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : subscriptionQuota?.hasActiveAbonnement && subscriptionQuota.abonnement ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Abonnement</p>
                <p className="text-lg font-bold text-gray-900">{subscriptionQuota.abonnement.type}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Jusqu&apos;au {formatDate(subscriptionQuota.abonnement.end)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Sponsors inclus</p>
                <p className="text-lg font-bold text-gray-900">
                  {subscriptionQuota.sponsorsAllocated}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Utilisés</p>
                <p className="text-lg font-bold text-gray-900">{subscriptionQuota.sponsorsUsed}</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">Restants</p>
                <p
                  className={`text-lg font-bold ${
                    subscriptionQuota.sponsorsRemaining > 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {subscriptionQuota.sponsorsRemaining}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
              Aucun abonnement actif. Contactez l&apos;administrateur pour activer votre compte.
            </div>
          )}

          {subscriptionQuota?.hasActiveAbonnement && subscriptionQuota.sponsorsAllocated <= 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
              Votre abonnement n&apos;inclut pas de sponsors gratuits. Utilisez le sponsoring VIP payant
              ci-dessous.
            </div>
          )}

          {subscriptionQuota?.hasActiveAbonnement &&
            subscriptionQuota.sponsorsAllocated > 0 &&
            subscriptionQuota.sponsorsRemaining <= 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                Vous n&apos;avez plus de sponsors disponibles ({subscriptionQuota.sponsorsUsed}/
                {subscriptionQuota.sponsorsAllocated} utilisés). Vous pouvez utiliser le sponsoring VIP.
              </div>
            )}
        </div>

        {/* VIP sponsor (paid via Chargily) */}
        <div className="bg-white rounded-2xl shadow-lg border border-purple-200 p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Crown className="w-6 h-6 text-purple-600" />
                Sponsoring VIP
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Mettez en avant vos produits avec un pack VIP et payez en ligne via Chargily
              </p>
            </div>
            <button
              onClick={openVipSponsorModal}
              disabled={
                products.length === 0 ||
                sponsorPlans.length === 0 ||
                productsAvailableForSponsor.length === 0
              }
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              Sponsoriser VIP
            </button>
          </div>

        {pendingSponsorProducts.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <CreditCard className="w-5 h-5" />
              Paiements en attente ({pendingSponsorProducts.length})
            </div>
            <div className="space-y-2">
              {pendingSponsorProducts.map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {record.product?.name || "Produit"}
                    </p>
                    <p className="text-gray-600">
                      {record.price.toLocaleString("fr-FR")} DA · {record.time}{" "}
                      {record.time === 1 ? "jour" : "jours"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCompletePayment(record.id)}
                    disabled={resumingPaymentId === record.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {resumingPaymentId === record.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    Compléter le paiement
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeProductIds.length > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-900">
            {activeProductIds.length} produit{activeProductIds.length > 1 ? "s" : ""} avec sponsoring actif —
            impossible d&apos;en créer un nouveau tant que la période n&apos;est pas terminée.
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Plans VIP disponibles</h3>
          {isLoadingSponsor ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : sponsorPlans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sponsorPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="border border-purple-200 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-white"
                >
                  <div className="flex items-center gap-2 text-purple-700 font-semibold mb-2">
                    <Clock className="w-4 h-4" />
                    {plan.time} {plan.time === 1 ? "jour" : "jours"}
                  </div>
                  <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    {plan.price.toLocaleString("fr-FR")} DA
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun plan sponsor configuré par l&apos;administrateur.</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            Historique par produit
          </h3>
          {isLoadingSponsor ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : sponsorHistoryByProduct.length > 0 ? (
            <div className="space-y-3">
              {sponsorHistoryByProduct.map((group) => {
                const isExpanded = expandedHistoryIds.has(group.productId);
                const activeRecord = group.history.find((r) => r.isActive);
                const pendingRecord = group.history.find((r) => !r.payment_status);
                const historyCount = group.history.length;

                return (
                  <div
                    key={group.productId}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHistoryExpand(group.productId)}
                      className="w-full flex items-center justify-between gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {group.productImage ? (
                          <img
                            src={getMediaUrl(group.productImage)}
                            alt={group.productName}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{group.productName}</p>
                          <p className="text-xs text-gray-500">
                            {historyCount} sponsoring{historyCount > 1 ? "s" : ""}
                            {activeRecord
                              ? ` · actif jusqu'au ${formatDate(activeRecord.end_time)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {pendingRecord && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCompletePayment(pendingRecord.id);
                            }}
                            disabled={resumingPaymentId === pendingRecord.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                          >
                            {resumingPaymentId === pendingRecord.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <CreditCard className="w-3 h-3" />
                            )}
                            Compléter
                          </button>
                        )}
                        {activeRecord && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Actif
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="overflow-x-auto border-t border-gray-200">
                        <table className="w-full min-w-[640px]">
                          <thead>
                            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                              <th className="py-2 px-3 font-semibold">Date</th>
                              <th className="py-2 px-3 font-semibold">Durée</th>
                              <th className="py-2 px-3 font-semibold">Prix</th>
                              <th className="py-2 px-3 font-semibold">Période</th>
                              <th className="py-2 px-3 font-semibold">Statut</th>
                              <th className="py-2 px-3 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.history.map((record) => {
                              const status = getSponsorStatus(record);
                              return (
                                <tr key={record.id} className="border-b border-gray-50 text-sm">
                                  <td className="py-2 px-3 text-gray-600">
                                    {record.createdAt
                                      ? formatDate(record.createdAt)
                                      : "—"}
                                  </td>
                                  <td className="py-2 px-3 text-gray-700">
                                    {record.time} {record.time === 1 ? "jour" : "jours"}
                                  </td>
                                  <td className="py-2 px-3 text-gray-700">
                                    {record.price.toLocaleString("fr-FR")} DA
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {formatDate(record.start_time)} → {formatDate(record.end_time)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-semibold ${status.className}`}
                                    >
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {!record.payment_status && (
                                      <button
                                        type="button"
                                        onClick={() => void handleCompletePayment(record.id)}
                                        disabled={resumingPaymentId === record.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                                      >
                                        {resumingPaymentId === record.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CreditCard className="w-3 h-3" />
                                        )}
                                        Compléter le paiement
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Aucun historique de sponsoring pour vos produits.</p>
          )}
        </div>
        </div>
      </div>

      {mounted &&
        showVipSponsorModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Sponsoring VIP</h3>
                </div>
                <button
                  onClick={() => setShowVipSponsorModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateSponsor} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Produit à sponsoriser <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Sélectionner un produit</option>
                    {productsAvailableForSponsor.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {productsAvailableForSponsor.length === 0 && (
                    <p className="text-xs text-amber-700 mt-2">
                      Tous vos produits ont un sponsoring actif ou en attente. Attendez la fin de la période
                      en cours.
                    </p>
                  )}
                  {products.length > productsAvailableForSponsor.length && (
                    <p className="text-xs text-gray-500 mt-2">
                      {products.length - productsAvailableForSponsor.length} produit
                      {products.length - productsAvailableForSponsor.length > 1 ? "s" : ""} exclu
                      {products.length - productsAvailableForSponsor.length > 1 ? "s" : ""} (sponsoring actif)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Plan VIP <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Sélectionner un plan</option>
                    {sponsorPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.time} jours — {plan.price.toLocaleString("fr-FR")} DA
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPlanId && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-900">
                    Vous serez redirigé vers Chargily pour payer en ligne (EDAHABIA / CIB).
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVipSponsorModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreatingSponsor ||
                      !selectedPlanId ||
                      !selectedProductId ||
                      productsAvailableForSponsor.length === 0
                    }
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingSponsor ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    Payer avec Chargily
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        showSubscriptionSponsorModal &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Sponsoring abonnement</h3>
                </div>
                <button
                  onClick={() => setShowSubscriptionSponsorModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateSubscriptionSponsor} className="p-6 space-y-4">
                {subscriptionQuota && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900 space-y-1">
                    <p>
                      <strong>Abonnement:</strong> {subscriptionQuota.abonnement?.type}
                    </p>
                    <p>
                      <strong>Quota restant:</strong> {subscriptionQuota.sponsorsRemaining} /{" "}
                      {subscriptionQuota.sponsorsAllocated}
                    </p>
                    <p className="text-xs text-blue-700">Durée: 2 jours · Sans paiement</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Produit à sponsoriser <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedSubscriptionProductId}
                    onChange={(e) => setSelectedSubscriptionProductId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Sélectionner un produit</option>
                    {productsAvailableForSponsor.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubscriptionSponsorModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreatingSubscriptionSponsor ||
                      !selectedSubscriptionProductId ||
                      productsAvailableForSponsor.length === 0 ||
                      !subscriptionQuota?.canCreateSubscriptionSponsor
                    }
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCreatingSubscriptionSponsor ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Activer (gratuit)
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        fichePdfViewer &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setFichePdfViewer(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-white shrink-0" />
                  <h3 className="text-lg font-bold text-white truncate">
                    {fichePdfViewer.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={fichePdfViewer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Nouvel onglet
                  </a>
                  <button
                    type="button"
                    onClick={() => setFichePdfViewer(null)}
                    className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-100 min-h-0">
                <iframe
                  src={fichePdfViewer.url}
                  title={fichePdfViewer.title}
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-green-600" />
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
