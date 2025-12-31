"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  FlaskConical,
  ArrowLeft,
  ShoppingCart,
  Heart,
  Check,
  Package,
  Clock,
  Shield,
  Star,
  Scale,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";

interface Product {
  id: number;
  name: string;
  price: string;
  description: string;
  category: string;
  fullDescription: string;
  features: string[];
  deliveryTime: string;
  laboratory: string;
  rating: number;
  reviews: number;
}

// Mock products data - in production, this would come from an API
const productsData: Product[] = [
  {
    id: 1,
    name: "Analyse de sang complète",
    price: "89€",
    description: "Analyse complète du sang incluant hémogramme, bilan lipidique, glycémie et fonction hépatique",
    fullDescription: "Cette analyse de sang complète est l'examen de référence pour évaluer votre état de santé général. Elle comprend un hémogramme complet (globules rouges, blancs, plaquettes), un bilan lipidique (cholestérol, triglycérides), une glycémie à jeun, un bilan hépatique complet, ainsi qu'une numération formule sanguine. Les résultats sont disponibles sous 24-48h.",
    category: "Analyses médicales",
    features: [
      "Hémogramme complet",
      "Bilan lipidique",
      "Glycémie",
      "Fonction hépatique",
      "Résultats en 24-48h",
      "Rapport détaillé",
    ],
    deliveryTime: "24-48 heures",
    laboratory: "Laboratoire Central Médical",
    rating: 4.8,
    reviews: 124,
  },
  {
    id: 2,
    name: "Test ADN paternité",
    price: "199€",
    description: "Test de paternité par ADN avec résultats en 3-5 jours ouvrables",
    fullDescription: "Test de paternité fiable à 99.99% utilisant les dernières technologies d'analyse ADN. Ce test compare l'ADN de l'enfant avec celui du père présumé. Kit d'échantillonnage fourni, prélèvement simple et non invasif. Résultats certifiés et confidentiels.",
    category: "Tests génétiques",
    features: [
      "Précision 99.99%",
      "Kit fourni",
      "Prélèvement simple",
      "Résultats en 3-5 jours",
      "Certifié et confidentiel",
    ],
    deliveryTime: "3-5 jours ouvrables",
    laboratory: "Institut Génétique Avancé",
    rating: 4.9,
    reviews: 89,
  },
  {
    id: 3,
    name: "Analyse microbiologique",
    price: "149€",
    description: "Analyse microbiologique complète pour détection de bactéries et pathogènes",
    fullDescription: "Analyse microbiologique complète permettant la détection et l'identification de bactéries, virus, champignons et autres micro-organismes pathogènes. Inclut des tests de sensibilité aux antibiotiques pour un traitement efficace.",
    category: "Analyses médicales",
    features: [
      "Détection bactéries",
      "Identification pathogènes",
      "Tests sensibilité antibiotiques",
      "Résultats en 48-72h",
    ],
    deliveryTime: "48-72 heures",
    laboratory: "Lab Microbiologie Pro",
    rating: 4.7,
    reviews: 56,
  },
  {
    id: 4,
    name: "Test de dépistage",
    price: "59€",
    description: "Test de dépistage rapide avec résultats en 24h",
    fullDescription: "Test de dépistage rapide et fiable pour diverses conditions. Résultats disponibles rapidement pour un dépistage précoce et une prise en charge optimale.",
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
    description: "Analyse complète de l'environnement pour qualité de l'air et de l'eau",
    fullDescription: "Analyse complète de votre environnement incluant la qualité de l'air, de l'eau, et des surfaces. Détection de polluants, allergènes, et contaminants pour un environnement sain.",
    category: "Analyses environnementales",
    features: [
      "Qualité air et eau",
      "Détection polluants",
      "Rapport complet",
      "Recommandations",
    ],
    deliveryTime: "5-7 jours",
    laboratory: "Lab Environnement",
    rating: 4.8,
    reviews: 45,
  },
  {
    id: 6,
    name: "Contrôle qualité alimentaire",
    price: "179€",
    description: "Contrôle de qualité et sécurité alimentaire selon normes européennes",
    fullDescription: "Contrôle de qualité et sécurité alimentaire conforme aux normes européennes. Analyse des composants, détection de contaminants, vérification de la traçabilité.",
    category: "Contrôle qualité",
    features: [
      "Normes européennes",
      "Détection contaminants",
      "Traçabilité",
      "Certification",
    ],
    deliveryTime: "3-5 jours",
    laboratory: "Qualité Alimentaire Lab",
    rating: 4.9,
    reviews: 78,
  },
  {
    id: 7,
    name: "Analyse toxicologique",
    price: "299€",
    description: "Analyse toxicologique complète avec recherche de substances",
    fullDescription: "Analyse toxicologique complète permettant la détection et la quantification de substances toxiques, médicaments, et drogues dans différents échantillons biologiques.",
    category: "Analyses médicales",
    features: [
      "Détection substances",
      "Analyse complète",
      "Résultats détaillés",
      "Confidentialité totale",
    ],
    deliveryTime: "5-7 jours",
    laboratory: "Institut Toxicologie",
    rating: 4.7,
    reviews: 34,
  },
  {
    id: 8,
    name: "Test génétique",
    price: "349€",
    description: "Test génétique complet avec rapport détaillé sur les prédispositions",
    fullDescription: "Test génétique complet analysant vos prédispositions génétiques, origines ancestrales, et traits héréditaires. Rapport détaillé et consultations disponibles.",
    category: "Tests génétiques",
    features: [
      "Analyse complète ADN",
      "Prédispositions",
      "Origines ancestrales",
      "Rapport détaillé",
    ],
    deliveryTime: "7-10 jours",
    laboratory: "Génétique Avancée",
    rating: 4.8,
    reviews: 112,
  },
];

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToCart } = useCart();
  const productId = parseInt(params.id as string);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, fetch from API
    const foundProduct = productsData.find((p) => p.id === productId);
    setProduct(foundProduct || null);
    setIsLoading(false);
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;

    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
      },
      quantity
    );
    alert(`${quantity} ${product.name} ajouté(s) au panier !`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="animate-pulse text-blue-600">
          <FlaskConical className="w-12 h-12" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produit non trouvé</h1>
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
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="animate-fade-in-up animation-delay-100">
            <div className="aspect-square bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center shadow-2xl">
              <FlaskConical className="w-32 h-32 text-blue-600" />
            </div>
          </div>

          {/* Product Info */}
          <div className="animate-fade-in-up animation-delay-200">
            <div className="mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                {product.category}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600">
                {product.rating} ({product.reviews} avis)
              </span>
            </div>

            <p className="text-xl sm:text-2xl font-bold text-blue-600 mb-6">
              {product.price}
            </p>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 leading-relaxed">{product.fullDescription}</p>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Caractéristiques</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {product.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-gray-700 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Details */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Délai de livraison</p>
                  <p className="font-semibold text-gray-900">{product.deliveryTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Laboratoire</p>
                  <p className="font-semibold text-gray-900">{product.laboratory}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Garantie</p>
                  <p className="font-semibold text-gray-900">Certifié et garanti</p>
                </div>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                  >
                    −
                  </button>
                  <span className="w-16 text-center text-lg font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-6 h-6" />
                Ajouter au panier
              </button>

              <Link
                href={`/products/compare?id1=${product.id}`}
                className="w-full py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <Scale className="w-5 h-5" />
                Comparer avec un autre produit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

