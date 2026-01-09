"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { getSupplierProducts, Product } from "@/lib/api";
import { getAuthToken } from "@/lib/api";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    const loadProducts = async () => {
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
    };

    loadProducts();
  }, [router]);

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
            // Use base URL without /api for static files
            // Use base URL without /api for static files
            const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace('/api', '');
            // Fix image path - remove leading slash if present and ensure correct path
            let mainImage = null;
            if (product.images && product.images.length > 0) {
              let imagePath = product.images[0];
              // Remove leading slash if present
              if (imagePath.startsWith('/')) {
                imagePath = imagePath.slice(1);
              }
              // Ensure path doesn't have double slashes
              mainImage = `${API_BASE_URL}/${imagePath}`.replace(/([^:]\/)\/+/g, "$1");
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
    </div>
  );
}
