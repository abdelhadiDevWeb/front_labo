"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Package,
  ShoppingCart,
  Building2,
  Tag,
  Clock,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  Scale,
  X,
  Check,
  DollarSign,
  SlidersHorizontal,
  MapPin,
  Navigation,
} from "lucide-react";
import { getAllProducts, getPublicCategories, PublicProduct, Category, getSessionRole } from "@/lib/api";
import { setCompareProductIds } from "@/lib/flow-session";
import { useCart } from "@/contexts/CartContext";
import LoginAlert from "@/components/LoginAlert";
import { getMediaUrl } from "@/lib/media-url";
import { useUserLocation } from "@/hooks/useUserLocation";
import { normalizeWilaya, sortProductsByProximity } from "@/lib/product-proximity";
import { resolveWilayaCode, supplierCoversWilaya } from "@/lib/algeria-wilayas";


export default function ProductsPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterSousCategoryId, setFilterSousCategoryId] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterDeliveryTime, setFilterDeliveryTime] = useState<string>("all");
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [displayProducts, setDisplayProducts] = useState<PublicProduct[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  const { location: userLocation, status: locationStatus, source: locationSource, requestBrowserLocation } =
    useUserLocation();

  const requiresWilayaForCatalog = isGuest || userRole === "client";

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSessionRole();
      if (!session) {
        setIsGuest(true);
        setUserRole(null);
        setIsAuthenticated(false);
        return;
      }

      setIsGuest(false);
      setUserRole(session.role);
      setIsAuthenticated(session.role === "client");
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const result = await getPublicCategories();
        if (result.success && result.data) {
          setDbCategories(result.data.categories);
        }
      } catch (err) {
        console.error("Load categories error:", err);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const wilayaCode = resolveWilayaCode(userLocation?.wilaya);

        if (requiresWilayaForCatalog && !wilayaCode) {
          setProducts([]);
          return;
        }

        const result = await getAllProducts(
          wilayaCode
            ? { wilayaCode }
            : userLocation?.wilaya
              ? { wilayaCode: userLocation.wilaya }
              : undefined
        );
        if (result.success && result.data) {
          setProducts(result.data.products || []);
        } else {
          setError(result.message || "Erreur lors du chargement des produits");
        }
      } catch {
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };

    if (requiresWilayaForCatalog && locationStatus === "loading") {
      return;
    }

    loadProducts();
  }, [requiresWilayaForCatalog, userLocation?.wilaya, locationStatus]);

  const selectedCategory = useMemo(
    () => dbCategories.find((c) => c.id === filterCategoryId),
    [dbCategories, filterCategoryId]
  );
  const availableSousCategories = useMemo(
    () => selectedCategory?.sousCategories ?? [],
    [selectedCategory]
  );

  // Get unique values for filters
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const suppliers = Array.from(new Set(products.map((p) => p.supplier?.name).filter(Boolean))).sort();
  const deliveryTimes = Array.from(new Set(products.map((p) => p.deliveryTime))).sort();

  const clientWilayaCode = useMemo(
    () => resolveWilayaCode(userLocation?.wilaya),
    [userLocation?.wilaya]
  );
  const appliesWilayaFilter = requiresWilayaForCatalog && !!clientWilayaCode;

  // Filter products (client-side — no page reload on category change)
  const filteredProducts = useMemo(() => {
    const category = dbCategories.find((c) => c.id === filterCategoryId);
    const sousCategories = category?.sousCategories ?? [];

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.supplier && product.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        filterCategoryId === "all" ||
        product.id_catgory === filterCategoryId ||
        (!product.id_catgory &&
          !!category &&
          product.category.toLowerCase() === category.name_catgory.toLowerCase());
      const matchesSousCategory =
        filterSousCategoryId === "all" ||
        product.id_sous_catgory === filterSousCategoryId ||
        (!product.id_sous_catgory &&
          filterSousCategoryId !== "all" &&
          sousCategories.some(
            (sc) =>
              sc.id === filterSousCategoryId &&
              product.category.toLowerCase() === sc.name_sou_catgory.toLowerCase()
          ));
      const matchesBrand = filterBrand === "all" || product.brand === filterBrand;
      const matchesSupplier = filterSupplier === "all" || product.supplier?.name === filterSupplier;
      const matchesDeliveryTime =
        filterDeliveryTime === "all" || product.deliveryTime === filterDeliveryTime;

      const productPrice = product.price;
      const minPrice = filterPriceMin ? parseFloat(filterPriceMin) : 0;
      const maxPrice = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
      const matchesPrice = productPrice >= minPrice && productPrice <= maxPrice;

      const matchesWilaya =
        !appliesWilayaFilter ||
        (!!clientWilayaCode && supplierCoversWilaya(product.supplier, clientWilayaCode));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSousCategory &&
        matchesBrand &&
        matchesSupplier &&
        matchesDeliveryTime &&
        matchesPrice &&
        matchesWilaya
      );
    });
  }, [
    products,
    searchTerm,
    filterCategoryId,
    filterSousCategoryId,
    filterBrand,
    filterSupplier,
    filterDeliveryTime,
    filterPriceMin,
    filterPriceMax,
    dbCategories,
    appliesWilayaFilter,
    clientWilayaCode,
  ]);

  const filteredProductsRef = useRef(filteredProducts);
  filteredProductsRef.current = filteredProducts;

  const filteredProductIdsKey = useMemo(
    () => filteredProducts.map((p) => p.id).join("|"),
    [filteredProducts]
  );

  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const userWilaya = userLocation?.wilaya ?? "";

  useEffect(() => {
    if (userLat == null || userLng == null) {
      return;
    }

    let cancelled = false;
    const currentFiltered = filteredProductsRef.current;
    const currentLocation = { latitude: userLat, longitude: userLng, wilaya: userWilaya || undefined };

    setIsSorting(true);
    sortProductsByProximity(currentFiltered, currentLocation)
      .then((sorted) => {
        if (!cancelled) setDisplayProducts(sorted);
      })
      .catch(() => {
        if (!cancelled) setDisplayProducts(currentFiltered);
      })
      .finally(() => {
        if (!cancelled) setIsSorting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filteredProductIdsKey, userLat, userLng, userWilaya]);

  const productsToShow =
    userLocation && locationStatus === "granted" && displayProducts.length > 0
      ? displayProducts
      : filteredProducts;

  // Handle product comparison selection
  const toggleComparison = (productId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(productId)) {
        // Remove from selection
        return prev.filter((id) => id !== productId);
      } else {
        // Add to selection (max 5 products)
        if (prev.length >= 5) {
          alert("Vous pouvez comparer un maximum de 5 produits à la fois");
          return prev;
        }
        return [...prev, productId];
      }
    });
  };

  const clearComparison = () => {
    setSelectedForComparison([]);
  };

  const handleCompare = () => {
    if (selectedForComparison.length < 2) {
      alert("Veuillez sélectionner au moins 2 produits pour comparer");
      return;
    }
    // Navigate to comparison page with selected product IDs
    setCompareProductIds(selectedForComparison);
    router.push("/products/compare");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des produits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/home"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tous les Produits</h1>
                <p className="text-sm text-gray-600">{products.length} produit{products.length > 1 ? "s" : ""} disponible{products.length > 1 ? "s" : ""}</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-24 sm:pr-32 py-2.5 sm:py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1 sm:gap-2 font-medium text-xs sm:text-sm"
              >
                <SlidersHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Filtres</span>
                {showFilters && (
                  <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {[
                      filterCategoryId !== "all",
                      filterSousCategoryId !== "all",
                      filterBrand !== "all",
                      filterSupplier !== "all",
                      filterDeliveryTime !== "all",
                      filterPriceMin || filterPriceMax,
                    ].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 shadow-lg mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filtres avancés
                </h3>
                <button
                  onClick={() => {
                    setFilterCategoryId("all");
                    setFilterSousCategoryId("all");
                    setFilterBrand("all");
                    setFilterSupplier("all");
                    setFilterDeliveryTime("all");
                    setFilterPriceMin("");
                    setFilterPriceMax("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Réinitialiser
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Tag className="w-4 h-4 text-blue-600" />
                    Catégorie
                  </label>
                  <select
                    value={filterCategoryId}
                    onChange={(e) => {
                      setFilterCategoryId(e.target.value);
                      setFilterSousCategoryId("all");
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm"
                  >
                    <option value="all">Toutes les catégories</option>
                    {dbCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name_catgory}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sous-category Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Tag className="w-4 h-4 text-blue-600" />
                    Sous-catégorie
                  </label>
                  <select
                    value={filterSousCategoryId}
                    onChange={(e) => setFilterSousCategoryId(e.target.value)}
                    disabled={filterCategoryId === "all" || availableSousCategories.length === 0}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="all">
                      {filterCategoryId === "all"
                        ? "Choisir une catégorie"
                        : availableSousCategories.length === 0
                          ? "Aucune sous-catégorie"
                          : "Toutes les sous-catégories"}
                    </option>
                    {availableSousCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name_sou_catgory}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Package className="w-4 h-4 text-blue-600" />
                    Marque
                  </label>
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm"
                  >
                    <option value="all">Toutes</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supplier Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Fournisseur
                  </label>
                  <select
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm"
                  >
                    <option value="all">Tous</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Delivery Time Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Délai de livraison
                  </label>
                  <select
                    value={filterDeliveryTime}
                    onChange={(e) => setFilterDeliveryTime(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm"
                  >
                    <option value="all">Tous</option>
                    {deliveryTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Range Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    Prix (DA)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterPriceMin}
                      onChange={(e) => setFilterPriceMin(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      min="0"
                    />
                    <span className="self-center text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterPriceMax}
                      onChange={(e) => setFilterPriceMax(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Active Filters Count */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {productsToShow.length} produit{productsToShow.length > 1 ? "s" : ""} trouvé
                  {productsToShow.length > 1 ? "s" : ""}
                  {userLocation && locationStatus === "granted" ? " · du plus proche au plus loin" : ""}
                </p>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Masquer les filtres
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Comparison Bar */}
      {selectedForComparison.length > 0 && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg border-b border-blue-700">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="font-semibold text-sm sm:text-base">
                  {selectedForComparison.length} produit{selectedForComparison.length > 1 ? "s" : ""} sélectionné{selectedForComparison.length > 1 ? "s" : ""}
                </span>
                {selectedForComparison.length < 5 && (
                  <span className="text-xs sm:text-sm text-blue-100 hidden sm:inline">
                    (Vous pouvez en sélectionner jusqu'à {5 - selectedForComparison.length} de plus)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedForComparison.length >= 2 && (
                  <button
                    onClick={handleCompare}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
                  >
                    <Scale className="w-4 h-4" />
                    <span>Comparer</span>
                  </button>
                )}
                <button
                  onClick={clearComparison}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex-shrink-0"
                  title="Effacer la sélection"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(locationStatus === "prompt" || locationStatus === "denied") && requiresWilayaForCatalog && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {isGuest ? "Localisation requise" : "Afficher les produits de votre wilaya"}
                </p>
                <p className="text-sm text-gray-600">
                  {isGuest
                    ? "Sans connexion, nous utilisons la position de votre navigateur pour afficher uniquement les produits disponibles dans votre wilaya."
                    : "Autorisez la localisation pour voir les produits disponibles dans votre wilaya."}
                </p>
              </div>
            </div>
            <button
              onClick={requestBrowserLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Autoriser la localisation
            </button>
          </div>
        )}

        {locationStatus === "granted" && userLocation && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-800">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>
              Produits triés par proximité
              {userLocation.wilaya ? ` (votre wilaya : ${userLocation.wilaya})` : ""}
              {locationSource === "profile" ? " · depuis votre profil" : " · depuis votre position"}
            </span>
            {isSorting && <Loader2 className="w-4 h-4 animate-spin ml-auto" />}
          </div>
        )}

        {userRole === "client" && !clientWilayaCode && locationStatus !== "loading" && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            Complétez la localisation de votre profil ou autorisez la géolocalisation du navigateur pour voir les
            produits disponibles dans votre wilaya.
          </div>
        )}

        {isGuest && !clientWilayaCode && locationStatus !== "loading" && locationStatus !== "granted" && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            Autorisez la géolocalisation du navigateur pour voir les produits disponibles dans votre wilaya.
          </div>
        )}

        {isGuest && !clientWilayaCode && locationStatus === "loading" && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-sm text-blue-800">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            Détection de votre position via le navigateur...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {productsToShow.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {products.length === 0 ? "Aucun produit" : "Aucun produit trouvé"}
            </h3>
            <p className="text-gray-600">
              {products.length === 0
                ? appliesWilayaFilter && clientWilayaCode
                  ? "Aucun produit disponible pour votre wilaya pour le moment"
                  : "Aucun produit disponible pour le moment"
                : "Essayez de modifier vos filtres de recherche"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {productsToShow.map((product) => {
                const mainImage =
                  product.images && product.images.length > 0
                    ? getMediaUrl(product.images[0])
                    : null;
                const isSameWilaya =
                  userLocation?.wilaya &&
                  product.wilaya &&
                  normalizeWilaya(userLocation.wilaya) === normalizeWilaya(product.wilaya);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group relative"
                >
                  {/* Comparison Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleComparison(product.id);
                      }}
                      className={`p-2 rounded-lg transition-all shadow-lg ${
                        selectedForComparison.includes(product.id)
                          ? "bg-blue-600 text-white"
                          : "bg-white/90 text-gray-600 hover:bg-white"
                      }`}
                      title={
                        selectedForComparison.includes(product.id)
                          ? "Désélectionner pour la comparaison"
                          : "Sélectionner pour la comparaison"
                      }
                    >
                      {selectedForComparison.includes(product.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Scale className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Image Section */}
                  <Link href={`/products/${product.id}`}>
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
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
                      {isSameWilaya && (
                        <div className="absolute bottom-3 left-3">
                          <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Votre wilaya
                          </span>
                        </div>
                      )}
                      {product.quantity === 0 && (
                        <div className={`absolute ${isSameWilaya ? "bottom-12" : "bottom-3"} left-3`}>
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                            Rupture de stock
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Content Section */}
                  <div className="p-5">
                    {/* Product Name */}
                    <Link href={`/products/${product.id}`}>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Supplier Info */}
                    {product.supplier && (
                      <Link
                        href={`/supplier/${product.supplier.id}`}
                        className="flex items-center gap-2 mb-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group"
                      >
                        <Building2 className="w-4 h-4 group-hover:text-blue-600" />
                        <span className="truncate group-hover:underline">{product.supplier.name}</span>
                      </Link>
                    )}

                    {/* Brand and Category */}
                    <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        <span className="truncate">{product.category}</span>
                      </div>
                      {product.wilaya && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{product.wilaya}</span>
                          </div>
                        </>
                      )}
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{product.brand}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{product.deliveryTime}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (isAuthenticated && userRole === "client") {
                            addToCart({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                            });
                          } else {
                            setLoginAlertOpen(true);
                          }
                        }}
                        disabled={product.quantity === 0}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{product.quantity === 0 ? "Rupture" : "Ajouter"}</span>
                      </button>
                      <Link
                        href={`/products/${product.id}`}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Login Alert */}
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
