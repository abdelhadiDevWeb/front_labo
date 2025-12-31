"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  Search,
  ShoppingCart,
  Heart,
  Scale,
  Filter,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  category: string;
  image?: string;
}

// Mock products data - in production, this would come from an API
const allProducts: Product[] = [
  {
    id: 1,
    name: "Analyse de sang complète",
    price: "89€",
    description: "Analyse complète du sang incluant hémogramme, bilan lipidique, glycémie et fonction hépatique",
    category: "Analyses médicales",
  },
  {
    id: 2,
    name: "Test ADN paternité",
    price: "199€",
    description: "Test de paternité par ADN avec résultats en 3-5 jours ouvrables",
    category: "Tests génétiques",
  },
  {
    id: 3,
    name: "Analyse microbiologique",
    price: "149€",
    description: "Analyse microbiologique complète pour détection de bactéries et pathogènes",
    category: "Analyses médicales",
  },
  {
    id: 4,
    name: "Test de dépistage",
    price: "59€",
    description: "Test de dépistage rapide avec résultats en 24h",
    category: "Tests de dépistage",
  },
  {
    id: 5,
    name: "Analyse environnementale",
    price: "249€",
    description: "Analyse complète de l'environnement pour qualité de l'air et de l'eau",
    category: "Analyses environnementales",
  },
  {
    id: 6,
    name: "Contrôle qualité alimentaire",
    price: "179€",
    description: "Contrôle de qualité et sécurité alimentaire selon normes européennes",
    category: "Contrôle qualité",
  },
  {
    id: 7,
    name: "Analyse toxicologique",
    price: "299€",
    description: "Analyse toxicologique complète avec recherche de substances",
    category: "Analyses médicales",
  },
  {
    id: 8,
    name: "Test génétique",
    price: "349€",
    description: "Test génétique complet avec rapport détaillé sur les prédispositions",
    category: "Tests génétiques",
  },
  {
    id: 9,
    name: "Analyse de l'eau",
    price: "129€",
    description: "Analyse complète de la qualité de l'eau potable",
    category: "Analyses environnementales",
  },
  {
    id: 10,
    name: "Test allergie",
    price: "159€",
    description: "Panel complet de tests allergiques pour identification des allergènes",
    category: "Analyses médicales",
  },
  {
    id: 11,
    name: "Analyse de sol",
    price: "199€",
    description: "Analyse complète de la composition et qualité du sol",
    category: "Analyses environnementales",
  },
  {
    id: 12,
    name: "Test de nutrition",
    price: "89€",
    description: "Analyse nutritionnelle avec recommandations personnalisées",
    category: "Analyses médicales",
  },
];

export default function ProductsPage() {
  const router = useRouter();
  const { addToCart: addToCartContext } = useCart();
  const [products, setProducts] = useState<Product[]>(allProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [compareItems, setCompareItems] = useState<number[]>([]);

  // Get unique categories
  const categories = ["all", ...Array.from(new Set(allProducts.map((p) => p.category)))];

  // Filter products
  useEffect(() => {
    let filtered = allProducts;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setProducts(filtered);
  }, [searchQuery, selectedCategory]);

  const toggleCompare = (productId: number) => {
    setCompareItems((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else if (prev.length < 2) {
        return [...prev, productId];
      } else {
        // Replace the first item if already 2 items
        return [prev[1], productId];
      }
    });
  };

  const handleCompareClick = () => {
    if (compareItems.length === 2) {
      router.push(`/products/compare?id1=${compareItems[0]}&id2=${compareItems[1]}`);
    }
  };

  const addToCart = (product: Product) => {
    addToCartContext({
      id: product.id,
      name: product.name,
      price: product.price,
    });
    alert(`${product.name} ajouté au panier !`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour à l'accueil</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Tous les produits
              </h1>
              <p className="text-gray-600">
                Découvrez notre catalogue complet d'analyses et de tests
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4 animate-fade-in-up animation-delay-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white shadow-lg transform scale-105"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {category === "all" ? "Tous" : category}
              </button>
            ))}
          </div>
        </div>

        {/* Compare Bar */}
        {compareItems.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between animate-fade-in-up">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-blue-600" />
              <span className="text-gray-700 font-medium">
                {compareItems.length}/2 produits sélectionnés pour comparaison
              </span>
            </div>
            {compareItems.length === 2 && (
              <button
                onClick={handleCompareClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all transform hover:scale-105"
              >
                Comparer
              </button>
            )}
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 border border-gray-100 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Link href={`/products/${product.id}`}>
                <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg sm:rounded-xl mb-4 flex items-center justify-center transform transition-transform hover:scale-110 cursor-pointer">
                  <FlaskConical className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 transform transition-transform hover:rotate-12" />
                </div>
              </Link>

              <div className="flex items-start justify-between mb-2">
                <Link href={`/products/${product.id}`}>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 transition-colors hover:text-blue-600 line-clamp-2 cursor-pointer">
                    {product.name}
                  </h3>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompare(product.id);
                  }}
                  className={`p-2 rounded-lg transition-all flex-shrink-0 ml-2 ${
                    compareItems.includes(product.id)
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  }`}
                  title="Comparer"
                >
                  <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                {product.description}
              </p>

              <p className="text-xl sm:text-2xl font-bold text-blue-600 mb-4">
                {product.price}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => addToCart(product)}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all transform hover:scale-105 text-sm sm:text-base"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span>Ajouter</span>
                  </div>
                </button>
                <Link
                  href={`/products/${product.id}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm sm:text-base"
                >
                  Détails
                </Link>
              </div>
            </div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Aucun produit trouvé</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

