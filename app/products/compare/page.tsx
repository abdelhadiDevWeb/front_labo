"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Scale,
  Package,
  DollarSign,
  Box,
  Clock,
  Tag,
  Building2,
  Image as ImageIcon,
  X,
  AlertCircle,
} from "lucide-react";
import { getProductById, PublicProduct } from "@/lib/api";
import { getCompareProductIds, setCompareProductIds, clearCompareProductIds } from "@/lib/flow-session";
import { getMediaUrl as buildMediaUrl } from "@/lib/media-url";
import CatalogPrice, { useCanSeeCatalogPrice } from "@/components/CatalogPrice";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import BackButton from "@/components/BackButton";

const getMediaUrl = (mediaPath: string) => {
  return buildMediaUrl(mediaPath) || "";
};

function CompareProductsContent() {
  const router = useRouter();
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { canSeePrice } = useCanSeeCatalogPrice();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const ids = getCompareProductIds();
        if (!ids) {
          setError("Aucun produit sélectionné pour la comparaison");
          setIsLoading(false);
          return;
        }

        if (ids.length < 2 || ids.length > 5) {
          setError("Veuillez sélectionner entre 2 et 5 produits pour la comparaison");
          setIsLoading(false);
          return;
        }

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
  }, []);

  const removeProduct = (productId: string) => {
    const newProducts = products.filter((p) => p.id !== productId);
    if (newProducts.length < 2) {
      clearCompareProductIds();
      router.push("/products");
      return;
    }
    setProducts(newProducts);
    setCompareProductIds(newProducts.map((p) => p.id));
  };

  if (isLoading) {
    return <AppLoadingScreen />;
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
          <BackButton
            fallbackHref="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            iconClassName="w-5 h-5"
            label={<span>Retour</span>}
          />
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

  const prices = products.map((p) => Number(p.price) || 0).filter((n) => n > 0);
  const bestPrice = canSeePrice && prices.length > 1 ? Math.min(...prices) : null;
  const stocks = products.map((p) => (typeof p.quantity === "number" ? p.quantity : 0));
  const bestStock = stocks.length > 1 && Math.max(...stocks) > 0 ? Math.max(...stocks) : null;

  const renderValue = (product: PublicProduct, key: string) => {
    if (key === "price") {
      const isBest = bestPrice !== null && Number(product.price) === bestPrice;
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5 md:justify-center">
          <CatalogPrice
            amount={product.price}
            visible={canSeePrice}
            className="font-bold text-blue-600"
            lockedClassName="text-xs font-medium text-gray-500"
          />
          {isBest && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Meilleur prix
            </span>
          )}
        </span>
      );
    }
    if (key === "quantity") {
      const inStock = product.quantity > 0;
      const isBest = bestStock !== null && product.quantity === bestStock;
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5 md:justify-center">
          <span className={`font-semibold ${inStock ? "text-green-600" : "text-red-600"}`}>
            {inStock ? `${product.quantity} en stock` : "Rupture"}
          </span>
          {isBest && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Plus grand stock
            </span>
          )}
        </span>
      );
    }
    if (key === "supplier") {
      return <span className="text-gray-700">{product.supplier ? product.supplier.name : "N/A"}</span>;
    }
    return (
      <span className="text-gray-700">
        {(product as unknown as Record<string, string | undefined>)[key] || "N/A"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(1.5rem+var(--lab-nav-offset,0px))] md:pb-0">
      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 sm:h-16 items-center gap-2 px-2 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/products"
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full text-gray-700 active:bg-gray-100 sm:hover:bg-gray-100"
            iconClassName="w-5 h-5"
          />
          <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-md">
            <Scale className="h-5 w-5 text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base sm:text-2xl font-bold text-gray-900">
              Comparaison de produits
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              {products.length} produit{products.length > 1 ? "s" : ""} sélectionné
              {products.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      {/* Phone layout */}
      <main className="md:hidden py-3 space-y-3">
        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => {
            const mainImage = product.images?.length ? getMediaUrl(product.images[0]) : null;
            return (
              <div
                key={product.id}
                className="relative w-[44%] min-w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => removeProduct(product.id)}
                  aria-label={`Retirer ${product.name} de la comparaison`}
                  className="absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow active:bg-red-50 active:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                    {product.quantity === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Rupture
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-2.5">
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">
                      {product.name}
                    </h3>
                    <CatalogPrice
                      amount={product.price}
                      visible={canSeePrice}
                      className="text-sm font-bold text-blue-600"
                      lockedClassName="text-[11px] font-medium text-gray-500"
                    />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5 px-3">
          {comparisonFields
            .filter((field) => field.key !== "name")
            .map((field) => {
              const Icon = field.icon;
              return (
                <section
                  key={field.key}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <h2 className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900">
                    <Icon className="h-4 w-4 text-blue-600" />
                    {field.label}
                  </h2>
                  <ul className="divide-y divide-gray-100">
                    {products.map((product) => (
                      <li key={product.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-500">
                          {product.name}
                        </span>
                        <span className="max-w-[58%] text-right text-sm">
                          {renderValue(product, field.key)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      </main>

      {/* Tablet / desktop layout */}
      <main className="hidden md:block container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <CatalogPrice
                      amount={product.price}
                      visible={canSeePrice}
                      className="text-2xl font-bold text-blue-600"
                    />
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
                          {renderValue(product, field.key)}
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
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <BackButton
            fallbackHref="/products"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all inline-flex items-center gap-2"
            label="Retour"
          />
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

export default function CompareProductsPage() {
  return (
    <Suspense
      fallback={<AppLoadingScreen />}
    >
      <CompareProductsContent />
    </Suspense>
  );
}
