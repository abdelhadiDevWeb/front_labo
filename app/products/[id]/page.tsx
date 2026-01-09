"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Clock,
  Building2,
  Tag,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getProductById, PublicProduct, getAuthToken } from "@/lib/api";
import LoginAlert from "@/components/LoginAlert";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

const getMediaUrl = (mediaPath: string) => {
  const path = mediaPath.startsWith("/") ? mediaPath.slice(1) : mediaPath;
  return `${API_BASE_URL}/${path}`;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToCart } = useCart();
  const productId = params.id as string;
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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
    if (productId) {
      const loadProduct = async () => {
        try {
          setIsLoading(true);
          setError(null);
          const result = await getProductById(productId);
          if (result.success && result.data) {
            setProduct(result.data);
          } else {
            setError(result.message || "Produit non trouvé");
          }
        } catch (err) {
          setError("Une erreur est survenue");
          console.error("Load product error:", err);
        } finally {
          setIsLoading(false);
        }
      };

      loadProduct();
    }
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;

    if (isAuthenticated && userRole === "client") {
      for (let i = 0; i < quantity; i++) {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
        });
      }
      alert(`${quantity} ${product.name} ajouté(s) au panier !`);
    } else {
      setLoginAlertOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Produit non trouvé"}
          </h1>
          <p className="text-gray-600 mb-6">
            Le produit que vous recherchez n'existe pas ou n'est plus disponible.
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

  const mainImage =
    product.images && product.images.length > 0
      ? getMediaUrl(product.images[selectedImageIndex])
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Retour aux produits</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Images and Video */}
          <div className="space-y-4">
            {/* Main Image/Video */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <div className="relative">
                  <img
                    src={mainImage || ""}
                    alt={product.name}
                    className="w-full h-96 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setSelectedImageIndex((prev) =>
                            prev === 0 ? product.images!.length - 1 : prev - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setSelectedImageIndex((prev) =>
                            prev === product.images!.length - 1 ? 0 : prev + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                    {product.images.map((_, index) => (
                      <span
                        key={index}
                        className={`w-2.5 h-2.5 rounded-full ${
                          index === selectedImageIndex ? "bg-white" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : product.video ? (
                <video controls src={getMediaUrl(product.video)} className="w-full h-96 object-cover"></video>
              ) : (
                <div className="w-full h-96 flex items-center justify-center bg-gray-200 text-gray-400">
                  <ImageIcon className="w-24 h-24" />
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-3">
                {product.images.map((imagePath, index) => (
                  <div
                    key={index}
                    className={`relative w-full h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                      index === selectedImageIndex ? "border-blue-500" : "border-gray-200"
                    } hover:border-blue-400 transition-all`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={getMediaUrl(imagePath)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Video */}
            {product.video && product.images && product.images.length === 0 && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-md border border-gray-200">
                <video controls src={getMediaUrl(product.video)} className="w-full h-full object-cover"></video>
                <p className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-md">
                  Vidéo du produit
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Product Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {product.category}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.productType === "Labo médical"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {product.productType}
                    </span>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  <div className="flex items-center gap-3 text-gray-600 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      <span>{product.brand}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{product.deliveryTime}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                    product.quantity > 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.quantity > 0 ? "En stock" : "Rupture"}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Prix</h2>
              <p className="text-4xl font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
            </div>

            {/* Supplier Information */}
            {product.supplier && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Informations du fournisseur</span>
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Nom</p>
                      <p className="font-semibold text-gray-900">{product.supplier.name}</p>
                    </div>
                  </div>
                  {product.supplier.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-gray-900">{product.supplier.email}</p>
                      </div>
                    </div>
                  )}
                  {product.supplier.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Téléphone</p>
                        <p className="font-semibold text-gray-900">{product.supplier.phone}</p>
                      </div>
                    </div>
                  )}
                  {product.supplier.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Adresse</p>
                        <p className="font-semibold text-gray-900">{product.supplier.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stock & Delivery */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Stock & Livraison</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantité en stock</p>
                    <p className="text-xl font-bold text-blue-700">{product.quantity}</p>
                  </div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Délai de livraison</p>
                    <p className="text-xl font-bold text-yellow-700">{product.deliveryTime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="w-16 text-center text-lg font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                    className="w-10 h-10 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity >= product.quantity}
                  >
                    +
                  </button>
                </div>
                {product.quantity > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {product.quantity} disponible{product.quantity > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <button
                onClick={handleAddToCart}
                disabled={product.quantity === 0}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <ShoppingCart className="w-6 h-6" />
                {product.quantity === 0 ? "Rupture de stock" : "Ajouter au panier"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Login Alert */}
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
