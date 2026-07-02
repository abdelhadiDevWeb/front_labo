"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Package,
  ArrowLeft,
  Loader2,
  Sparkles,
  Search,
} from "lucide-react";
import { getSponsoredProducts, SponsoredPublicProduct } from "@/lib/api";
import SponsoredProductCard from "@/components/SponsoredProductCard";

export default function SponsoredProductsPage() {
  const [products, setProducts] = useState<SponsoredPublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await getSponsoredProducts();
        if (result.success && result.data) {
          setProducts(result.data.products || []);
        } else {
          setError(result.message || "Erreur lors du chargement");
        }
      } catch {
        setError("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.supplier?.name.toLowerCase().includes(q)
    );
  }, [products, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Link
            href="/home#sponsored-section"
            className="inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/30">
              <Megaphone className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Produits sponsorisés</h1>
          </div>
          <p className="text-blue-100/80 text-sm sm:text-base max-w-2xl">
            Tous les produits actuellement mis en avant par nos fournisseurs partenaires
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-sm">
            <Sparkles className="w-4 h-4 text-purple-300" />
            {products.length} produit{products.length > 1 ? "s" : ""} sponsorisé
            {products.length > 1 ? "s" : ""}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un produit sponsorisé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredProducts.map((product) => (
              <SponsoredProductCard key={product.id} product={product} className="w-full" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? "Aucun résultat" : "Aucun produit sponsorisé"}
            </h2>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? "Essayez un autre terme de recherche"
                : "Revenez plus tard pour découvrir les produits mis en avant"}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
            >
              Voir tous les produits
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
