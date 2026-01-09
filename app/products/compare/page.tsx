"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  Package,
  DollarSign,
  Box,
  Clock,
  Tag,
  Building2,
  Image as ImageIcon,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getProductById, PublicProduct } from "@/lib/api";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

const getMediaUrl = (mediaPath: string) => {
  const path = mediaPath.startsWith("/") ? mediaPath.slice(1) : mediaPath;
  return `${API_BASE_URL}/${path}`;
};

export default function CompareProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const idsParam = searchParams.get("ids");
        if (!idsParam) {
          setError("Aucun produit sélectionné pour la comparaison");
          setIsLoading(false);
          return;
        }

        const ids = idsParam.split(",").filter((id) => id.trim());
        if (ids.length < 2 || ids.length > 5) {
          setError("Veuillez sélectionner entre 2 et 5 produits pour la comparaison");
          setIsLoading(false);
          return;
        }

        // Fetch all products
        const productPromises = ids.map((id) => getProductById(id.trim()));
        const results = await Promise.all(productPromises);

        const loadedProducts: PublicProduct[] = [];
        for (const result of results) {
          if (result.success && result.data) {
            loadedProducts.push(result.data);
          }
        }

        if (loadedProducts.length < 2) {
          setError("Impossible de charger les produits sélectionnés");
          setIsLoading(false);
          return;
        }

        setProducts(loadedProducts);
      } catch (err) {
        console.error("Load products error:", err);
        setError("Une erreur est survenue lors du chargement des produits");
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [searchParams]);

  const removeProduct = (productId: string) => {
    const newProducts = products.filter((p) => p.id !== productId);
    if (newProducts.length < 2) {
      router.push("/products");
      return;
    }
    setProducts(newProducts);
    // Update URL
    const newIds = newProducts.map((p) => p.id).join(",");
    router.push(`/products/compare?ids=${newIds}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la comparaison...</p>
        </div>
      </div>
    );
  }

  if (error || products.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Pas assez de produits à comparer"}
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "Veuillez sélectionner au moins 2 produits pour la comparaison"}
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux produits</span>
          </Link>
        </div>
      </div>
    );
  }

  // Get all unique properties for comparison
  const comparisonFields = [
    { key: "name", label: "Nom", icon: Package },
    { key: "price", label: "Prix", icon: DollarSign },
    { key: "quantity", label: "Stock", icon: Box },
    { key: "category", label: "Catégorie", icon: Tag },
    { key: "brand", label: "Marque", icon: Building2 },
    { key: "deliveryTime", label: "Délai de livraison", icon: Clock },
    { key: "productType", label: "Type de produit", icon: Package },
    { key: "supplier", label: "Fournisseur", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/products"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Comparaison de Produits</h1>
                  <p className="text-sm text-gray-600">
                    {products.length} produit{products.length > 1 ? "s" : ""} sélectionné{products.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Products Grid */}
        <div className="mb-8 overflow-x-auto">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${products.length}, minmax(280px, 1fr))` }}
          >
            {/* Product Headers */}
            {products.map((product) => {
              const mainImage =
                product.images && product.images.length > 0
                  ? getMediaUrl(product.images[0])
                  : null;

              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Remove Button */}
                  <div className="p-4 border-b border-gray-200 flex justify-end">
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Retirer de la comparaison"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Product Image */}
                  <Link href={`/products/${product.id}`}>
                    <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-24 h-24 text-gray-400" />
                        </div>
                      )}
                      {product.quantity === 0 && (
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                            Rupture
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Name */}
                  <div className="p-4">
                    <Link href={`/products/${product.id}`}>
                      <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-3">
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
                    <p className="text-2xl font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                    Caractéristique
                  </th>
                  {products.map((product) => (
                    <th
                      key={product.id}
                      className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b border-gray-200 min-w-[200px]"
                    >
                      <Link
                        href={`/products/${product.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {product.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((field, index) => {
                  const Icon = field.icon;
                  return (
                    <tr
                      key={field.key}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{field.label}</span>
                        </div>
                      </td>
                      {products.map((product) => (
                        <td
                          key={product.id}
                          className="px-6 py-4 text-center border-b border-gray-200"
                        >
                          {field.key === "price" ? (
                            <span className="font-bold text-blue-600">
                              {product.price.toFixed(2)} DA
                            </span>
                          ) : field.key === "quantity" ? (
                            <span
                              className={`font-semibold ${
                                product.quantity > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {product.quantity > 0 ? `${product.quantity} en stock` : "Rupture"}
                            </span>
                          ) : field.key === "supplier" ? (
                            <span className="text-gray-700">
                              {product.supplier ? product.supplier.name : "N/A"}
                            </span>
                          ) : (
                            <span className="text-gray-700">
                              {(product as any)[field.key] || "N/A"}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/products"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Retour aux produits
          </Link>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
            >
              Voir {product.name.substring(0, 15)}...
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
