"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Package,
  ShoppingCart,
  Heart,
  FlaskConical,
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
  ChevronDown,
} from "lucide-react";
import { getAllProducts, PublicProduct, getAuthToken } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import LoginAlert from "@/components/LoginAlert";

export default function ProductsPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSupplier, setFilterSupplier] = useState<string>("all");
  const [filterDeliveryTime, setFilterDeliveryTime] = useState<string>("all");
  const [filterPriceMin, setFilterPriceMin] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setUserRole(payload.role);
          setIsAuthenticated(payload.role === "client");
        } catch {
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const result = await getAllProducts();
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
    };

    loadProducts();
  }, []);

  // Get unique values for filters
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const suppliers = Array.from(new Set(products.map((p) => p.supplier?.name).filter(Boolean))).sort();
  const deliveryTimes = Array.from(new Set(products.map((p) => p.deliveryTime))).sort();

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.supplier && product.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    const matchesBrand = filterBrand === "all" || product.brand === filterBrand;
    const matchesSupplier = filterSupplier === "all" || product.supplier?.name === filterSupplier;
    const matchesDeliveryTime = filterDeliveryTime === "all" || product.deliveryTime === filterDeliveryTime;
    
    // Price filter
    const productPrice = product.price;
    const minPrice = filterPriceMin ? parseFloat(filterPriceMin) : 0;
    const maxPrice = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
    const matchesPrice = productPrice >= minPrice && productPrice <= maxPrice;

    return matchesSearch && matchesCategory && matchesBrand && matchesSupplier && matchesDeliveryTime && matchesPrice;
  });

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
    const ids = selectedForComparison.join(",");
    router.push(`/products/compare?ids=${ids}`);
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

  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit, marque, catégorie ou fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-32 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-base"
              />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filtres</span>
                {showFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {[
                      filterCategory !== "all",
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
                    setFilterCategory("all");
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Tag className="w-4 h-4 text-blue-600" />
                    Catégorie
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none bg-white cursor-pointer text-sm"
                  >
                    <option value="all">Toutes</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
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
                  {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}
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
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5" />
                <span className="font-semibold">
                  {selectedForComparison.length} produit{selectedForComparison.length > 1 ? "s" : ""} sélectionné{selectedForComparison.length > 1 ? "s" : ""} pour comparaison
                </span>
                {selectedForComparison.length < 5 && (
                  <span className="text-sm text-blue-100">
                    (Vous pouvez en sélectionner jusqu'à {5 - selectedForComparison.length} de plus)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedForComparison.length >= 2 && (
                  <button
                    onClick={handleCompare}
                    className="px-4 py-2 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    Comparer
                  </button>
                )}
                <button
                  onClick={clearComparison}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Effacer la sélection"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {products.length === 0 ? "Aucun produit" : "Aucun produit trouvé"}
            </h3>
            <p className="text-gray-600">
              {products.length === 0
                ? "Aucun produit disponible pour le moment"
                : "Essayez de modifier vos filtres de recherche"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const mainImage =
                product.images && product.images.length > 0
                  ? `${API_BASE_URL}/${product.images[0].startsWith("/") ? product.images[0].slice(1) : product.images[0]}`
                  : null;

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
                      {product.quantity === 0 && (
                        <div className="absolute bottom-3 left-3">
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
