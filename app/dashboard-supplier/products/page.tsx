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
  Upload,
  Video,
  Cpu,
  Wrench,
} from "lucide-react";
import {
  getSupplierProducts,
  getSupplierMachines,
  getSupplierServices,
  getSupplierHistoryXls,
  getHistoryXlsItems,
  deleteHistoryXlsItems,
  deleteProduct,
  deleteMachine,
  deleteService,
  getPublicCategories,
  Product,
  UniqueDataItem,
  HistoryXlsRecord,
  HistoryXlsItem,
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
import { getMediaUrl } from "@/lib/media-url";
import { isFicheTechniquePdfValue } from "@/lib/fiche-technique-url";
import { isFicheTechniqueField } from "@/lib/catalog-form-fields";
import { LABO_TYPE_OPTIONS, type LaboTypeValue } from "@/lib/labo-types";
import AppLoadingScreen from "@/components/AppLoadingScreen";

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

const itemDetailPath = (type: MarketplaceKind, id: string) =>
  type === "product"
    ? `/dashboard-supplier/products/${id}`
    : type === "machine"
      ? `/dashboard-supplier/machines/${id}`
      : `/dashboard-supplier/services/${id}`;

const pickHistoryItemName = (item: HistoryXlsItem): string => {
  if (item.name && String(item.name).trim()) return String(item.name).trim();
  const d = item.unique_data || {};
  for (const key of ["Désignation", "designation", "name", "nom", "Nom"]) {
    const v = d[key];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "Sans nom";
};

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
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [xlsHistory, setXlsHistory] = useState<HistoryXlsRecord[]>([]);
  const [isLoadingXlsHistory, setIsLoadingXlsHistory] = useState(true);
  const [xlsHistoryOpen, setXlsHistoryOpen] = useState(false);
  const [filterXlsType, setFilterXlsType] = useState<"all" | MarketplaceKind>("all");
  const [viewingHistory, setViewingHistory] = useState<HistoryXlsRecord | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryXlsItem[]>([]);
  const [isLoadingHistoryItems, setIsLoadingHistoryItems] = useState(false);
  const [historyItemsError, setHistoryItemsError] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<HistoryXlsItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
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
  const [isLoadingSponsor, setIsLoadingSponsor] = useState(true);
  const [showVipSponsorModal, setShowVipSponsorModal] = useState(false);
  const [showSubscriptionSponsorModal, setShowSubscriptionSponsorModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSubscriptionProductId, setSelectedSubscriptionProductId] = useState("");
  const [sponsorItemKind, setSponsorItemKind] = useState<MarketplaceKind>("product");
  const [isCreatingSponsor, setIsCreatingSponsor] = useState(false);
  const [isCreatingSubscriptionSponsor, setIsCreatingSubscriptionSponsor] = useState(false);
  const [resumingPaymentId, setResumingPaymentId] = useState<string | null>(null);
  const [sponsorSuccess, setSponsorSuccess] = useState<string | null>(null);
  const [sponsorError, setSponsorError] = useState<string | null>(null);
  const [sponsorImageFile, setSponsorImageFile] = useState<File | null>(null);
  const [sponsorVideoFile, setSponsorVideoFile] = useState<File | null>(null);
  const [sponsorImagePath, setSponsorImagePath] = useState("");
  const [sponsorVideoPath, setSponsorVideoPath] = useState("");
  const [sponsorImagePreview, setSponsorImagePreview] = useState<string | null>(null);
  const [sponsorMediaType, setSponsorMediaType] = useState<"image" | "video">("image");
  const [sponsorVideoPreview, setSponsorVideoPreview] = useState<string | null>(null);
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
        const [productsResult, machinesResult, servicesResult, categoriesResult, historyResult] =
          await Promise.all([
            getSupplierProducts(),
            getSupplierMachines(),
            getSupplierServices(),
            getPublicCategories(),
            getSupplierHistoryXls(),
          ]);

        const loadedProducts =
          productsResult.success && productsResult.data ? productsResult.data.products || [] : [];
        const loadedMachines =
          machinesResult.success && machinesResult.data ? machinesResult.data.machines || [] : [];
        const loadedServices =
          servicesResult.success && servicesResult.data ? servicesResult.data.services || [] : [];

        setMarketplaceItems([
          ...loadedProducts.map(productToItem),
          ...loadedMachines.map((m) => uniqueDataToItem(m, "machine")),
          ...loadedServices.map((s) => uniqueDataToItem(s, "service")),
        ]);

        if (categoriesResult.success && categoriesResult.data?.categories) {
          setCatalogCategories(categoriesResult.data.categories);
        }

        if (historyResult.success && historyResult.data?.history) {
          setXlsHistory(historyResult.data.history);
        }
        setIsLoadingXlsHistory(false);

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
        setIsLoadingXlsHistory(false);
      } finally {
        setIsLoading(false);
      }

      const sponsorParam = searchParams.get("sponsor");
      if (sponsorParam) {
        const qs = searchParams.toString();
        router.replace(`/dashboard-supplier/publicite${qs ? `?${qs}` : ""}`);
        return;
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

  const sponsorMediaPayload = () =>
    sponsorMediaType === "image"
      ? {
          imageFile: sponsorImageFile,
          videoFile: null,
          imagePath: sponsorImageFile ? null : sponsorImagePath || null,
          videoPath: null,
        }
      : {
          imageFile: null,
          videoFile: sponsorVideoFile,
          imagePath: null,
          videoPath: sponsorVideoFile ? null : sponsorVideoPath || null,
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
        itemType: sponsorItemKind,
        ...sponsorMediaPayload(),
      });

      if (result.success) {
        const created = result.data?.sponsorProduct;
        const durationLabel =
          created?.timeUnit === "hours"
            ? `${created.time} heure${created.time === 1 ? "" : "s"}`
            : created
              ? `${created.time} jour${created.time === 1 ? "" : "s"}`
              : null;
        setSponsorSuccess(
          durationLabel && created
            ? `Sponsoring activé (${durationLabel}) : ${formatDateTime(created.start_time)} → ${formatDateTime(created.end_time)}`
            : "Sponsoring activé via votre abonnement (sans paiement) !"
        );
        setShowSubscriptionSponsorModal(false);
        resetSponsorMedia();
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
        itemType: sponsorItemKind,
        ...sponsorMediaPayload(),
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

  const formatDateTime = (value: string | Date) =>
    new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const subscriptionSponsorDurationHours =
    subscriptionQuota?.sponsorDurationHours ??
    subscriptionQuota?.abonnement?.sponsorDurationHours ??
    0;

  const subscriptionSponsorPeriodPreview = useMemo(() => {
    if (!subscriptionSponsorDurationHours || subscriptionSponsorDurationHours < 1) {
      return null;
    }
    const start = new Date();
    let end = new Date(start.getTime() + subscriptionSponsorDurationHours * 60 * 60 * 1000);
    const abonnementEnd = subscriptionQuota?.abonnement?.end
      ? new Date(subscriptionQuota.abonnement.end)
      : null;
    if (abonnementEnd && end > abonnementEnd) {
      end = abonnementEnd;
    }
    return { start, end, hours: subscriptionSponsorDurationHours };
  }, [subscriptionSponsorDurationHours, subscriptionQuota?.abonnement?.end]);

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

  const itemsAvailableForSponsor = useMemo(
    () =>
      marketplaceItems.filter(
        (item) => !activeProductIdSet.has(item.id) && !pendingProductIdSet.has(item.id)
      ),
    [marketplaceItems, activeProductIdSet, pendingProductIdSet]
  );

  const sponsorItemsForKind = useMemo(
    () => itemsAvailableForSponsor.filter((item) => item.kind === sponsorItemKind),
    [itemsAvailableForSponsor, sponsorItemKind]
  );

  const sponsorKindTotal = marketplaceItems.filter((item) => item.kind === sponsorItemKind).length;

  const sponsorHistoryByProduct = useMemo(() => {
    const grouped = new Map<
      string,
      {
        groupKey: string;
        itemType: MarketplaceKind;
        productName: string;
        productImage?: string;
        history: SponsorProductRecord[];
      }
    >();

    for (const record of sponsorProducts) {
      const itemType: MarketplaceKind = record.itemType || "product";
      const groupKey = `${itemType}:${record.id_product}`;
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.history.push(record);
      } else {
        grouped.set(groupKey, {
          groupKey,
          itemType,
          productName:
            record.product?.name ||
            (itemType === "machine" ? "Machine" : itemType === "service" ? "Service" : "Produit"),
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

  const clearSponsorImage = () => {
    setSponsorImageFile(null);
    setSponsorImagePath("");
    setSponsorImagePreview(null);
  };

  const clearSponsorVideo = () => {
    setSponsorVideoFile(null);
    setSponsorVideoPath("");
    setSponsorVideoPreview(null);
  };

  const resetSponsorMedia = () => {
    clearSponsorImage();
    clearSponsorVideo();
  };

  const handleSponsorMediaTypeChange = (type: "image" | "video") => {
    if (type === sponsorMediaType) return;
    if (type === "image") clearSponsorVideo();
    else clearSponsorImage();
    setSponsorMediaType(type);
  };

  const firstAvailableSponsorId = (kind: MarketplaceKind) =>
    itemsAvailableForSponsor.find((item) => item.kind === kind)?.id || "";

  const pickInitialSponsorKind = (): MarketplaceKind =>
    (["product", "machine", "service"] as MarketplaceKind[]).find((kind) =>
      itemsAvailableForSponsor.some((item) => item.kind === kind)
    ) || "product";

  const openVipSponsorModal = () => {
    const kind = pickInitialSponsorKind();
    setSponsorItemKind(kind);
    setSelectedPlanId(sponsorPlans[0]?.id || "");
    setSelectedProductId(firstAvailableSponsorId(kind));
    resetSponsorMedia();
    setSponsorMediaType("image");
    setSponsorError(null);
    setShowVipSponsorModal(true);
  };

  const openSubscriptionSponsorModal = () => {
    const kind = pickInitialSponsorKind();
    setSponsorItemKind(kind);
    setSelectedSubscriptionProductId(firstAvailableSponsorId(kind));
    resetSponsorMedia();
    setSponsorMediaType("image");
    setSponsorError(null);
    setShowSubscriptionSponsorModal(true);
  };

  const handleSponsorKindChange = (kind: MarketplaceKind, modal: "vip" | "subscription") => {
    setSponsorItemKind(kind);
    if (modal === "vip") setSelectedProductId(firstAvailableSponsorId(kind));
    else setSelectedSubscriptionProductId(firstAvailableSponsorId(kind));
    resetSponsorMedia();
  };

  const kindOfLabel = (kind: MarketplaceKind) =>
    kind === "machine" ? "de la machine" : kind === "service" ? "du service" : "du produit";

  const renderSponsorMediaFields = (itemId: string) => {
    const item = marketplaceItems.find((i) => i.id === itemId && i.kind === sponsorItemKind);
    const productImages = item?.images ?? [];
    const productVideo = item?.video || null;
    const ofKind = kindOfLabel(sponsorItemKind);
    const previewUrl = sponsorImageFile
      ? sponsorImagePreview
      : sponsorImagePath
        ? getMediaUrl(sponsorImagePath)
        : null;
    const videoPreviewUrl = sponsorVideoFile
      ? sponsorVideoPreview
      : sponsorVideoPath
        ? getMediaUrl(sponsorVideoPath)
        : null;

    return (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-800">Média du sponsoring (optionnel)</p>
        <p className="text-xs text-gray-500">
          Choisissez une image <strong>ou</strong> une vidéo : uploadez-en une nouvelle, ou
          choisissez parmi celles {ofKind}.
        </p>

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type de média">
          {(
            [
              { type: "image", label: "Image", Icon: ImageIcon },
              { type: "video", label: "Vidéo", Icon: Video },
            ] as const
          ).map(({ type, label, Icon }) => {
            const selected = sponsorMediaType === type;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSponsorMediaTypeChange(type)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-purple-600 bg-purple-50 text-purple-900"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {sponsorMediaType === "image" && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Image</label>
          {productImages.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {productImages.map((img) => {
                const selected = !sponsorImageFile && sponsorImagePath === img;
                return (
                  <button
                    key={img}
                    type="button"
                    onClick={() => {
                      setSponsorImageFile(null);
                      setSponsorImagePreview(null);
                      setSponsorImagePath(selected ? "" : img);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                      selected ? "border-purple-600 ring-2 ring-purple-200" : "border-gray-200"
                    }`}
                  >
                    <img
                      src={getMediaUrl(img)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
          <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-gray-300 bg-white px-3 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            <span>{sponsorImageFile ? sponsorImageFile.name : "Uploader une nouvelle image"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSponsorImageFile(file);
                setSponsorImagePath("");
                setSponsorImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          {previewUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover border" />
              <button
                type="button"
                onClick={clearSponsorImage}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Retirer l&apos;image
              </button>
            </div>
          )}
        </div>
        )}

        {sponsorMediaType === "video" && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-2">Vidéo</label>
          {productVideo && (
            <button
              type="button"
              onClick={() => {
                setSponsorVideoFile(null);
                setSponsorVideoPath(
                  !sponsorVideoFile && sponsorVideoPath === productVideo ? "" : productVideo
                );
              }}
              className={`mb-3 w-full flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm text-left ${
                !sponsorVideoFile && sponsorVideoPath === productVideo
                  ? "border-purple-600 bg-purple-50 text-purple-900"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {!sponsorVideoFile && sponsorVideoPath === productVideo
                  ? `Vidéo ${ofKind} sélectionnée`
                  : `Utiliser la vidéo ${ofKind}`}
              </span>
            </button>
          )}
          <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-gray-300 bg-white px-3 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            <span>{sponsorVideoFile ? sponsorVideoFile.name : "Uploader une nouvelle vidéo"}</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSponsorVideoFile(file);
                setSponsorVideoPath("");
                setSponsorVideoPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          {videoPreviewUrl && (
            <video
              key={videoPreviewUrl}
              src={videoPreviewUrl}
              className="mt-2 w-full max-h-48 rounded-lg border bg-black object-contain"
              controls
              muted
              playsInline
              preload="metadata"
            />
          )}
          {(sponsorVideoFile || sponsorVideoPath) && (
            <button
              type="button"
              onClick={clearSponsorVideo}
              className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Retirer la vidéo
            </button>
          )}
        </div>
        )}
      </div>
    );
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

  const filteredXlsHistory =
    filterXlsType === "all"
      ? xlsHistory
      : xlsHistory.filter((h) => h.type === filterXlsType);

  const formatXlsDate = (value: string) => {
    try {
      return new Date(value).toLocaleString("fr-DZ", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  };

  const openHistoryItems = async (row: HistoryXlsRecord) => {
    setViewingHistory(row);
    setHistoryItems([]);
    setHistoryItemsError(null);
    setIsLoadingHistoryItems(true);
    try {
      const result = await getHistoryXlsItems(row.id);
      if (result.success && result.data) {
        setHistoryItems(result.data.items || []);
      } else {
        setHistoryItemsError(result.message || "Impossible de charger les éléments");
      }
    } catch (err) {
      console.error("Load history items error:", err);
      setHistoryItemsError("Une erreur est survenue");
    } finally {
      setIsLoadingHistoryItems(false);
    }
  };

  const closeHistoryItems = () => {
    setViewingHistory(null);
    setHistoryItems([]);
    setHistoryItemsError(null);
    setItemToDelete(null);
    setDeleteItemError(null);
    setConfirmDeleteAll(false);
    setDeleteAllError(null);
  };

  const confirmDeleteAllHistoryItems = async () => {
    if (!viewingHistory) return;
    setIsDeletingAll(true);
    setDeleteAllError(null);
    try {
      const result = await deleteHistoryXlsItems(viewingHistory.id);
      if (!result.success) {
        setDeleteAllError(result.message || "Erreur lors de la suppression");
        return;
      }
      const deletedId = viewingHistory.id;
      setXlsHistory((prev) => prev.filter((h) => h.id !== deletedId));
      setMarketplaceItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.kind === viewingHistory.type &&
              historyItems.some((h) => String(h.id) === item.id)
            )
        )
      );
      setConfirmDeleteAll(false);
      closeHistoryItems();
    } catch (err) {
      console.error("Delete all history items error:", err);
      setDeleteAllError("Une erreur est survenue");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const confirmDeleteHistoryItem = async () => {
    if (!viewingHistory || !itemToDelete) return;
    setIsDeletingItem(true);
    setDeleteItemError(null);
    try {
      const id = String(itemToDelete.id);
      const result =
        viewingHistory.type === "product"
          ? await deleteProduct(id)
          : viewingHistory.type === "machine"
            ? await deleteMachine(id)
            : await deleteService(id);

      if (!result.success) {
        setDeleteItemError(result.message || "Erreur lors de la suppression");
        return;
      }

      setHistoryItems((prev) => prev.filter((i) => String(i.id) !== id));
      setMarketplaceItems((prev) =>
        prev.filter((item) => !(item.id === id && item.kind === viewingHistory.type))
      );
      setXlsHistory((prev) =>
        prev.map((h) =>
          h.id === viewingHistory.id
            ? { ...h, itemsCount: Math.max(0, h.itemsCount - 1) }
            : h
        )
      );
      setViewingHistory((prev) =>
        prev ? { ...prev, itemsCount: Math.max(0, prev.itemsCount - 1) } : prev
      );
      setItemToDelete(null);
    } catch (err) {
      console.error("Delete history item error:", err);
      setDeleteItemError("Une erreur est survenue");
    } finally {
      setIsDeletingItem(false);
    }
  };

  const renderSponsorItemPicker = (modal: "vip" | "subscription") => {
    const isVip = modal === "vip";
    const selectedId = isVip ? selectedProductId : selectedSubscriptionProductId;
    const setSelectedId = isVip ? setSelectedProductId : setSelectedSubscriptionProductId;
    const selectedClass = isVip
      ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-200"
      : "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200";
    const focusClass = isVip ? "focus:ring-purple-500" : "focus:ring-blue-500";
    const kindName = kindLabel(sponsorItemKind);
    const kindArticle =
      sponsorItemKind === "machine" ? "une machine" : sponsorItemKind === "service" ? "un service" : "un produit";
    const kindPlural =
      sponsorItemKind === "machine" ? "machines" : sponsorItemKind === "service" ? "services" : "produits";
    const excludedCount = sponsorKindTotal - sponsorItemsForKind.length;

    return (
      <>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Que voulez-vous sponsoriser ? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["product", "machine", "service"] as MarketplaceKind[]).map((kind) => {
              const Icon = kind === "product" ? FlaskConical : kind === "machine" ? Cpu : Wrench;
              const available = itemsAvailableForSponsor.filter((i) => i.kind === kind).length;
              const selected = sponsorItemKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleSponsorKindChange(kind, modal)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-all ${
                    selected
                      ? selectedClass
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {kind === "product" ? "Produit" : kind === "machine" ? "Machine" : "Service"}
                  <span className="text-[11px] font-normal text-gray-500">
                    {available} disponible{available > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {kindName} à sponsoriser <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              resetSponsorMedia();
            }}
            className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 ${focusClass} outline-none`}
          >
            <option value="">Sélectionner {kindArticle}</option>
            {sponsorItemsForKind.map((item) => (
              <option key={item.id} value={item.id}>
                {getItemTitle(item)}
              </option>
            ))}
          </select>
          {sponsorKindTotal === 0 ? (
            <p className="text-xs text-amber-700 mt-2">
              Vous n&apos;avez aucun{sponsorItemKind === "machine" ? "e" : ""} {kindName.toLowerCase()} dans
              votre MarketPlace.
            </p>
          ) : sponsorItemsForKind.length === 0 ? (
            <p className="text-xs text-amber-700 mt-2">
              Tous vos {kindPlural} ont un sponsoring actif ou en attente. Attendez la fin de la période
              en cours.
            </p>
          ) : excludedCount > 0 ? (
            <p className="text-xs text-gray-500 mt-2">
              {excludedCount} {kindName.toLowerCase()}
              {excludedCount > 1 ? "s" : ""} exclu{sponsorItemKind === "machine" ? "e" : ""}
              {excludedCount > 1 ? "s" : ""} (sponsoring actif ou en attente)
            </p>
          ) : null}
        </div>

        {selectedId ? renderSponsorMediaFields(selectedId) : null}
      </>
    );
  };

  const renderMarketplaceCard = (item: MarketplaceItem) => {
    const title = getItemTitle(item);
    const entries = getUniqueDataEntries(item.unique_data);
    const activeSponsor = getActiveSponsorForProduct(item.id);
    const pendingSponsor = getPendingSponsorForProduct(item.id);
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

          <button
            type="button"
            onClick={() => {
              if (item.kind === "product") {
                router.push(`/dashboard-supplier/products/${item.id}`);
              } else if (item.kind === "machine") {
                router.push(`/dashboard-supplier/machines/${item.id}`);
              } else {
                router.push(`/dashboard-supplier/services/${item.id}`);
              }
            }}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Voir les détails
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Marché</h1>
            <p className="text-gray-600 mt-1">
              {kindCounts.all} élément{kindCounts.all > 1 ? "s" : ""} dans votre catalogue
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                kind: "product" as MarketplaceKind,
                label: "Produits",
                count: kindCounts.product,
                Icon: FlaskConical,
                active:
                  "border-green-500 bg-green-50 ring-2 ring-green-200 text-green-900",
                idle: "border-green-100 bg-white hover:border-green-300 hover:bg-green-50/60",
                iconBg: "bg-green-100 text-green-700",
              },
              {
                kind: "machine" as MarketplaceKind,
                label: "Machines",
                count: kindCounts.machine,
                Icon: Cpu,
                active:
                  "border-blue-500 bg-blue-50 ring-2 ring-blue-200 text-blue-900",
                idle: "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
                iconBg: "bg-blue-100 text-blue-700",
              },
              {
                kind: "service" as MarketplaceKind,
                label: "Services",
                count: kindCounts.service,
                Icon: Wrench,
                active:
                  "border-amber-500 bg-amber-50 ring-2 ring-amber-200 text-amber-900",
                idle: "border-amber-100 bg-white hover:border-amber-300 hover:bg-amber-50/60",
                iconBg: "bg-amber-100 text-amber-800",
              },
            ] as const
          ).map(({ kind, label, count, Icon, active, idle, iconBg }) => {
            const selected = filterKind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() =>
                  handleFilterKindChange(selected ? "all" : kind)
                }
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                  selected ? active : idle
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums leading-none">{count}</p>
                  <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Historique XLS — head of page, closed by default */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setXlsHistoryOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <History className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Historique XLS</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {xlsHistory.length} import{xlsHistory.length > 1 ? "s" : ""} Excel — produits, machines et services
              </p>
            </div>
          </div>
          {xlsHistoryOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {xlsHistoryOpen && (
          <div className="border-t border-gray-100 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative sm:w-56">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={filterXlsType}
                  onChange={(e) =>
                    setFilterXlsType(e.target.value as "all" | MarketplaceKind)
                  }
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none bg-white"
                >
                  <option value="all">Tous les types</option>
                  <option value="product">Produits</option>
                  <option value="machine">Machines</option>
                  <option value="service">Services</option>
                </select>
              </div>
            </div>

            {isLoadingXlsHistory ? (
              <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Chargement de l&apos;historique…</span>
              </div>
            ) : filteredXlsHistory.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucun import Excel</p>
                <p className="text-sm text-gray-500 mt-1">
                  Les imports XLS depuis Ajouter apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {filteredXlsHistory.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${kindBadgeClass(row.type)}`}
                        >
                          {kindLabel(row.type)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatXlsDate(row.created)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {row.catgory_name || "Catégorie"}
                        {row.sou_catgory_name ? ` → ${row.sou_catgory_name}` : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.itemsCount} élément{row.itemsCount > 1 ? "s" : ""} créé
                        {row.itemsCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void openHistoryItems(row)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                      Voir les{" "}
                      {row.type === "product"
                        ? "produits"
                        : row.type === "machine"
                          ? "machines"
                          : "services"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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

      {mounted &&
        viewingHistory &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeHistoryItems}
            />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${kindBadgeClass(viewingHistory.type)}`}
                    >
                      {kindLabel(viewingHistory.type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatXlsDate(viewingHistory.created)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 truncate">
                    {viewingHistory.catgory_name || "Import Excel"}
                    {viewingHistory.sou_catgory_name
                      ? ` → ${viewingHistory.sou_catgory_name}`
                      : ""}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {isLoadingHistoryItems
                      ? "Chargement…"
                      : `${historyItems.length} ${
                          viewingHistory.type === "product"
                            ? "produit(s)"
                            : viewingHistory.type === "machine"
                              ? "machine(s)"
                              : "service(s)"
                        }`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLoadingHistoryItems && historyItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteAllError(null);
                        setConfirmDeleteAll(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tout supprimer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeHistoryItems}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {isLoadingHistoryItems ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Chargement des éléments…</span>
                  </div>
                ) : historyItemsError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {historyItemsError}
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>Aucun élément lié à cet import</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {historyItems.map((item) => {
                      const img =
                        Array.isArray(item.images) && item.images[0]
                          ? getMediaUrl(String(item.images[0]))
                          : null;
                      return (
                        <li
                          key={String(item.id)}
                          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                            {img ? (
                              <img
                                src={img}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {pickHistoryItemName(item)}
                            </p>
                            {item.brand ? (
                              <p className="truncate text-xs text-gray-500">
                                {String(item.brand)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  itemDetailPath(viewingHistory.type, String(item.id))
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              title="Modifier"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteItemError(null);
                                setItemToDelete(item);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Supprimer
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        itemToDelete &&
        viewingHistory &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!isDeletingItem) {
                  setItemToDelete(null);
                  setDeleteItemError(null);
                }
              }}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">
                    Confirmer la suppression
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Voulez-vous vraiment supprimer{" "}
                    <span className="font-semibold text-gray-900">
                      « {pickHistoryItemName(itemToDelete)} »
                    </span>
                    ? Cette action est irréversible.
                  </p>
                </div>
              </div>
              {deleteItemError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {deleteItemError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteItemError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => void confirmDeleteHistoryItem()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeletingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Supprimer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        confirmDeleteAll &&
        viewingHistory &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!isDeletingAll) {
                  setConfirmDeleteAll(false);
                  setDeleteAllError(null);
                }
              }}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">
                    Supprimer tout l&apos;import
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cela supprimera les {historyItems.length}{" "}
                    {viewingHistory.type === "product"
                      ? "produit(s)"
                      : viewingHistory.type === "machine"
                        ? "machine(s)"
                        : "service(s)"}
                    {viewingHistory.catgory_name
                      ? ` (${viewingHistory.catgory_name}${
                          viewingHistory.sou_catgory_name
                            ? ` → ${viewingHistory.sou_catgory_name}`
                            : ""
                        })`
                      : ""}
                    . Action irréversible.
                  </p>
                </div>
              </div>
              {deleteAllError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {deleteAllError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => {
                    setConfirmDeleteAll(false);
                    setDeleteAllError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={() => void confirmDeleteAllHistoryItems()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeletingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Tout supprimer
                </button>
              </div>
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
                  src={`${fichePdfViewer.url}#toolbar=1&navpanes=0`}
                  title={fichePdfViewer.title}
                  className="w-full h-full border-0"
                  // Same-origin /api/files PDF — required for CSP frame-src 'self'
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
