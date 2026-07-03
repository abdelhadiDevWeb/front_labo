"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Package,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Image as ImageIcon,
  Video,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Box,
  Tag,
  Clock,
  Building2,
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
} from "lucide-react";
import {
  getSupplierProducts,
  Product,
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
import { getAuthToken } from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
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
        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const result = await getSupplierProducts();
        if (result.success && result.data) {
          setProducts(result.data.products || []);
        } else {
          setError(result.message || "Erreur lors du chargement des produits");
        }
      } catch (err) {
        setError("Une erreur est survenue");
        console.error("Load products error:", err);
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
        window.location.href = result.data.checkoutUrl;
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
        window.location.href = result.data.checkoutUrl;
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

  // Get unique categories and types for filters
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const types = Array.from(new Set(products.map((p) => p.productType))).sort();

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    const matchesType = filterType === "all" || product.productType === filterType;

    return matchesSearch && matchesCategory && matchesType;
  });

  // Calculate profit for a product
  const calculateProfit = (product: Product) => {
    const profit = product.sellingPrice - product.purchasePrice;
    const profitPercentage = product.purchasePrice > 0 ? ((profit / product.purchasePrice) * 100).toFixed(2) : "0";
    return { profit, profitPercentage };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Produits</h1>
          <p className="text-gray-600 mt-1">
            {products.length} produit{products.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard-supplier/add-product")}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter un produit</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none bg-white cursor-pointer"
            >
              <option value="all">Tous les types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {products.length === 0 ? "Aucun produit" : "Aucun produit trouvé"}
          </h3>
          <p className="text-gray-600 mb-6">
            {products.length === 0
              ? "Commencez par ajouter votre premier produit"
              : "Essayez de modifier vos filtres de recherche"}
          </p>
          {products.length === 0 && (
            <button
              onClick={() => router.push("/dashboard-supplier/add-product")}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
            >
              Ajouter un produit
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const profit = calculateProfit(product);
            const activeSponsor = getActiveSponsorForProduct(product.id);
            const pendingSponsor = getPendingSponsorForProduct(product.id);
            let mainImage = null;
            if (product.images && product.images.length > 0) {
              mainImage = getMediaUrl(product.images[0]);
            }

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group cursor-pointer"
                onClick={() => router.push(`/dashboard-supplier/products/${product.id}`)}
              >
                {/* Image Section */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {mainImage ? (
                    <img
                      src={mainImage}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        // If image fails to load, show placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.productType === "Labo médical"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {product.productType}
                    </span>
                  </div>
                  {product.quantity === 0 && (
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                        Rupture de stock
                      </span>
                    </div>
                  )}
                  {activeSponsor && (
                    <div className={`absolute ${product.quantity === 0 ? "top-12" : "top-3"} left-3`}>
                      <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-semibold flex items-center gap-1">
                        <Megaphone className="w-3 h-3" />
                        Sponsorisé
                      </span>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-5">
                  {/* Product Name */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-green-600 transition-colors">
                    {product.name}
                  </h3>

                  {/* Brand and Category */}
                  <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate">{product.brand}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      <span className="truncate">{product.category}</span>
                    </div>
                  </div>

                  {/* Prices and Profit */}
                  <div className="space-y-2 mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingDown className="w-4 h-4 text-gray-500" />
                        <span>Achat:</span>
                      </div>
                      <span className="font-semibold text-gray-900">{product.purchasePrice.toFixed(2)} DA</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span>Vente:</span>
                      </div>
                      <span className="font-semibold text-green-600">{product.sellingPrice.toFixed(2)} DA</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-green-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span>Bénéfice:</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-green-600">+{profit.profit.toFixed(2)} DA</span>
                        <span className="text-xs text-gray-600 ml-2">({profit.profitPercentage}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity and Delivery */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Box className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className="text-sm font-semibold text-gray-900">{product.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <div>
                        <p className="text-xs text-gray-500">Livraison</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.deliveryTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Media Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    {product.images && product.images.length > 0 && (
                      <div className="flex items-center gap-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>{product.images.length} image{product.images.length > 1 ? "s" : ""}</span>
                      </div>
                    )}
                    {product.video && (
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        <span>Vidéo</span>
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  {activeSponsor && (
                    <p className="text-xs text-purple-700 mb-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                      Sponsoring actif jusqu&apos;au {formatDate(activeSponsor.end_time)}
                    </p>
                  )}
                  {pendingSponsor && !activeSponsor && (
                    <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-900 mb-2">
                        Paiement en attente — {pendingSponsor.price.toLocaleString("fr-FR")} DA ·{" "}
                        {pendingSponsor.time} jours
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCompletePayment(pendingSponsor.id);
                        }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard-supplier/products/${product.id}`);
                    }}
                    className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir les détails</span>
                  </button>
                </div>
              </div>
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
