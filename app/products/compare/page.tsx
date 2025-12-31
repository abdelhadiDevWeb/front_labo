"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  Scale,
  Check,
  X,
  ShoppingCart,
} from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  category: string;
  features: string[];
  deliveryTime: string;
  laboratory: string;
  rating: number;
  reviews: number;
}

// This would come from API in production
const productsData: Product[] = [
  {
    id: 1,
    name: "Analyse de sang complète",
    price: "89€",
    description: "Analyse complète du sang",
    category: "Analyses médicales",
    features: ["Hémogramme complet", "Bilan lipidique", "Glycémie", "Fonction hépatique", "Résultats en 24-48h"],
    deliveryTime: "24-48 heures",
    laboratory: "Laboratoire Central Médical",
    rating: 4.8,
    reviews: 124,
  },
  {
    id: 2,
    name: "Test ADN paternité",
    price: "199€",
    description: "Test de paternité par ADN",
    category: "Tests génétiques",
    features: ["Précision 99.99%", "Kit fourni", "Prélèvement simple", "Résultats en 3-5 jours"],
    deliveryTime: "3-5 jours ouvrables",
    laboratory: "Institut Génétique Avancé",
    rating: 4.9,
    reviews: 89,
  },
  {
    id: 3,
    name: "Analyse microbiologique",
    price: "149€",
    description: "Analyse microbiologique complète",
    category: "Analyses médicales",
    features: ["Détection bactéries", "Identification pathogènes", "Tests sensibilité", "Résultats en 48-72h"],
    deliveryTime: "48-72 heures",
    laboratory: "Lab Microbiologie Pro",
    rating: 4.7,
    reviews: 56,
  },
  {
    id: 4,
    name: "Test de dépistage",
    price: "59€",
    description: "Test de dépistage rapide",
    category: "Tests de dépistage",
    features: ["Résultats en 24h", "Fiable et rapide", "Dépistage précoce"],
    deliveryTime: "24 heures",
    laboratory: "Centre de Dépistage Rapide",
    rating: 4.6,
    reviews: 203,
  },
  {
    id: 5,
    name: "Analyse environnementale",
    price: "249€",
    description: "Analyse complète de l'environnement",
    category: "Analyses environnementales",
    features: ["Qualité air et eau", "Détection polluants", "Rapport complet"],
    deliveryTime: "5-7 jours",
    laboratory: "Lab Environnement",
    rating: 4.8,
    reviews: 45,
  },
  {
    id: 6,
    name: "Contrôle qualité alimentaire",
    price: "179€",
    description: "Contrôle de qualité et sécurité",
    category: "Contrôle qualité",
    features: ["Normes européennes", "Détection contaminants", "Traçabilité"],
    deliveryTime: "3-5 jours",
    laboratory: "Qualité Alimentaire Lab",
    rating: 4.9,
    reviews: 78,
  },
  {
    id: 7,
    name: "Analyse toxicologique",
    price: "299€",
    description: "Analyse toxicologique complète",
    category: "Analyses médicales",
    features: ["Détection substances", "Analyse complète", "Résultats détaillés"],
    deliveryTime: "5-7 jours",
    laboratory: "Institut Toxicologie",
    rating: 4.7,
    reviews: 34,
  },
  {
    id: 8,
    name: "Test génétique",
    price: "349€",
    description: "Test génétique complet",
    category: "Tests génétiques",
    features: ["Analyse complète ADN", "Prédispositions", "Origines ancestrales"],
    deliveryTime: "7-10 jours",
    laboratory: "Génétique Avancée",
    rating: 4.8,
    reviews: 112,
  },
];

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [product1, setProduct1] = useState<Product | null>(null);
  const [product2, setProduct2] = useState<Product | null>(null);
  const [selectedProduct2, setSelectedProduct2] = useState<string>("");

  useEffect(() => {
    const id1 = searchParams.get("id1");
    const id2 = searchParams.get("id2");

    if (id1) {
      const p1 = productsData.find((p) => p.id === parseInt(id1));
      setProduct1(p1 || null);
    }

    if (id2) {
      const p2 = productsData.find((p) => p.id === parseInt(id2));
      setProduct2(p2 || null);
    }
  }, [searchParams]);

  const handleSelectProduct2 = () => {
    if (selectedProduct2) {
      const p2 = productsData.find((p) => p.id === parseInt(selectedProduct2));
      setProduct2(p2 || null);
      router.push(`/products/compare?id1=${product1?.id}&id2=${selectedProduct2}`);
    }
  };

  const addToCart = (product: Product) => {
    if (typeof window !== "undefined") {
      const cart = localStorage.getItem("cart");
      const cartItems = cart ? JSON.parse(cart) : [];
      const existingItem = cartItems.find((item: any) => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cartItems.push({ ...product, quantity: 1 });
      }

      localStorage.setItem("cart", JSON.stringify(cartItems));
      window.dispatchEvent(new Event("cartUpdated"));
      alert(`${product.name} ajouté au panier !`);
    }
  };

  if (!product1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sélectionnez un produit à comparer</h1>
          <Link
            href="/products"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  // Get all features for comparison
  const allFeatures = new Set<string>();
  if (product1) product1.features.forEach((f) => allFeatures.add(f));
  if (product2) product2.features.forEach((f) => allFeatures.add(f));
  const featuresArray = Array.from(allFeatures);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour aux produits</span>
          </Link>
          <div className="flex items-center gap-3">
            <Scale className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Comparaison de produits</h1>
          </div>
        </div>

        {/* Select Second Product */}
        {!product2 && (
          <div className="mb-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-200 animate-fade-in-up">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Sélectionnez un deuxième produit à comparer
            </h2>
            <div className="flex gap-4">
              <select
                value={selectedProduct2}
                onChange={(e) => setSelectedProduct2(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Choisir un produit...</option>
                {productsData
                  .filter((p) => p.id !== product1.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.price}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleSelectProduct2}
                disabled={!selectedProduct2}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comparer
              </button>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="grid lg:grid-cols-2 gap-6 animate-fade-in-up animation-delay-200">
          {/* Product 1 */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{product1.name}</h2>
              <p className="text-3xl font-bold text-blue-600 mb-4">{product1.price}</p>
              <button
                onClick={() => addToCart(product1)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Ajouter au panier
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Catégorie</h3>
                <p className="text-gray-900">{product1.category}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Délai</h3>
                <p className="text-gray-900">{product1.deliveryTime}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Laboratoire</h3>
                <p className="text-gray-900">{product1.laboratory}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Caractéristiques</h3>
                <div className="space-y-2">
                  {featuresArray.map((feature, index) => {
                    const hasFeature = product1.features.includes(feature);
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          hasFeature ? "bg-green-50" : "bg-gray-50"
                        }`}
                      >
                        {hasFeature ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={hasFeature ? "text-gray-900" : "text-gray-500"}>
                          {feature}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Product 2 */}
          {product2 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FlaskConical className="w-12 h-12 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product2.name}</h2>
                <p className="text-3xl font-bold text-purple-600 mb-4">{product2.price}</p>
                <button
                  onClick={() => addToCart(product2)}
                  className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ajouter au panier
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Catégorie</h3>
                  <p className="text-gray-900">{product2.category}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Délai</h3>
                  <p className="text-gray-900">{product2.deliveryTime}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Laboratoire</h3>
                  <p className="text-gray-900">{product2.laboratory}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">Caractéristiques</h3>
                  <div className="space-y-2">
                    {featuresArray.map((feature, index) => {
                      const hasFeature = product2.features.includes(feature);
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-2 p-2 rounded-lg ${
                            hasFeature ? "bg-green-50" : "bg-gray-50"
                          }`}
                        >
                          {hasFeature ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={hasFeature ? "text-gray-900" : "text-gray-500"}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-12 border-2 border-dashed border-gray-300 flex items-center justify-center">
              <div className="text-center">
                <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Sélectionnez un produit pour comparer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-blue-600">
          <Scale className="w-12 h-12" />
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
