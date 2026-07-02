"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Clock,
  FlaskConical,
  Loader2,
  Package,
  ShoppingCart,
  Tag,
} from "lucide-react";
import {
  getPublicCategoryById,
  getAllProducts,
  PublicProduct,
  Category,
  SousCategory,
  getAuthToken,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { useCart } from "@/contexts/CartContext";
import LoginAlert from "@/components/LoginAlert";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;
  const { addToCart } = useCart();

  const [category, setCategory] = useState<Category | null>(null);
  const [selectedSousCategory, setSelectedSousCategory] = useState<SousCategory | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setIsAuthenticated(payload.role === "client");
      } catch {
        setIsAuthenticated(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadCategory = async () => {
      setIsLoadingCategory(true);
      setError(null);
      try {
        const result = await getPublicCategoryById(categoryId);
        if (result.success && result.data) {
          setCategory(result.data);
          if (result.data.sousCategories.length > 0) {
            setSelectedSousCategory(result.data.sousCategories[0]);
          } else {
            setSelectedSousCategory(null);
          }
        } else {
          setError(result.message || "Catégorie introuvable");
        }
      } catch {
        setError("Erreur lors du chargement de la catégorie");
      } finally {
        setIsLoadingCategory(false);
      }
    };

    if (categoryId) loadCategory();
  }, [categoryId]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!categoryId) return;

      setIsLoadingProducts(true);
      try {
        const result = await getAllProducts({
          categoryId,
          sousCategoryId: selectedSousCategory?.id,
        });
        if (result.success && result.data) {
          setProducts(result.data.products || []);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, [categoryId, selectedSousCategory?.id]);

  const handleAddToCart = (product: PublicProduct) => {
    if (!isAuthenticated) {
      setLoginAlertOpen(true);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      supplierId: product.supplier?.id || "",
    });
  };

  if (isLoadingCategory) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <Package className="mb-4 h-16 w-16 text-gray-300" />
        <p className="mb-4 text-gray-600">{error || "Catégorie introuvable"}</p>
        <Link href="/home" className="text-blue-600 hover:text-blue-700 font-medium">
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  const categoryImage = getMediaUrl(category.image);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4 sm:px-6">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
              {category.name_catgory}
            </h1>
            <p className="truncate text-sm text-gray-500">{category.des}</p>
          </div>
          {categoryImage && (
            <img
              src={categoryImage}
              alt={category.name_catgory}
              className="h-12 w-12 rounded-xl object-cover border border-gray-200"
            />
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Sous-catégories */}
        <section className="mb-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Sous-catégories
          </h2>
          {category.sousCategories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              Aucune sous-catégorie disponible pour le moment.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {category.sousCategories.map((sc) => {
                const isActive = selectedSousCategory?.id === sc.id;
                const scImage = getMediaUrl(sc.image);
                return (
                  <button
                    key={sc.id}
                    onClick={() => setSelectedSousCategory(sc)}
                    className={`flex min-w-[140px] flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${
                      isActive
                        ? "border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-600/20"
                        : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                      {scImage ? (
                        <img src={scImage} alt={sc.name_sou_catgory} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Tag className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className={`text-center text-xs font-semibold sm:text-sm ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                      {sc.name_sou_catgory}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Products */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Produits
              {selectedSousCategory ? ` — ${selectedSousCategory.name_sou_catgory}` : ""}
            </h2>
            <span className="text-sm text-gray-500">{products.length} produit(s)</span>
          </div>

          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-600">Aucun produit dans cette sous-catégorie</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const mainImage = product.images?.[0] ? getMediaUrl(product.images[0]) : null;
                return (
                  <div
                    key={product.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <Link href={`/products/${product.id}`}>
                      <div className="relative h-44 bg-gray-100">
                        {mainImage ? (
                          <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <FlaskConical className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                        {product.quantity === 0 && (
                          <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white">
                            Rupture
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="mb-2 line-clamp-2 font-bold text-gray-900 hover:text-blue-600">
                          {product.name}
                        </h3>
                      </Link>
                      {product.supplier && (
                        <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{product.supplier.name}</span>
                        </div>
                      )}
                      <div className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{product.deliveryTime}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-lg font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={product.quantity === 0}
                          className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
