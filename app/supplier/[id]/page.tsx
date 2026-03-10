"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  ShoppingCart,
  DollarSign,
  Loader2,
  User,
  Star,
  CheckCircle,
  Clock,
  Tag,
  CreditCard,
  Wallet,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { getSupplierDetails, SupplierDetails, getSupplierRatings, createRate, canRateSupplier, getAuthToken, SupplierRatingsResponse, CanRateResponse } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

const getImageUrl = (imagePath: string | null) => {
  if (!imagePath) return null;
  const path = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return `${API_BASE_URL}/${path}`;
};

export default function SupplierDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const supplierId = params.id as string;
  const [supplierData, setSupplierData] = useState<SupplierDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRipPost, setCopiedRipPost] = useState(false);
  const [copiedRipBank, setCopiedRipBank] = useState(false);
  const [ratings, setRatings] = useState<SupplierRatingsResponse | null>(null);
  const [canRate, setCanRate] = useState<CanRateResponse | null>(null);
  const [ratingNumber, setRatingNumber] = useState<number>(0);
  const [ratingMessage, setRatingMessage] = useState<string>("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);

  useEffect(() => {
    if (supplierId) {
      loadSupplierDetails();
      loadRatings();
      checkCanRate();
    }
  }, [supplierId]);

  const loadSupplierDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getSupplierDetails(supplierId);
      if (result.success && result.data) {
        setSupplierData(result.data);
      } else {
        setError(result.message || "Fournisseur non trouvé");
      }
    } catch (err) {
      console.error("Load supplier details error:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRatings = async () => {
    try {
      setIsLoadingRatings(true);
      const result = await getSupplierRatings(supplierId);
      if (result.success && result.data) {
        setRatings(result.data);
      }
    } catch (err) {
      console.error("Load ratings error:", err);
    } finally {
      setIsLoadingRatings(false);
    }
  };

  const checkCanRate = async () => {
    const token = getAuthToken();
    if (!token) {
      setCanRate({ canRate: false, hasRated: false, existingRate: null });
      return;
    }
    try {
      const result = await canRateSupplier(supplierId);
      if (result.success && result.data) {
        setCanRate(result.data);
        if (result.data.existingRate) {
          setRatingNumber(result.data.existingRate.number);
          setRatingMessage(result.data.existingRate.message);
        }
      }
    } catch (err) {
      console.error("Check can rate error:", err);
    }
  };

  const handleSubmitRating = async () => {
    if (ratingNumber === 0 || !ratingMessage.trim()) {
      alert("Veuillez sélectionner une note et écrire un message");
      return;
    }

    setIsSubmittingRating(true);
    try {
      const result = await createRate(supplierId, ratingMessage, ratingNumber);
      if (result.success) {
        alert("Note ajoutée avec succès !");
        setRatingMessage("");
        setRatingNumber(0);
        await loadRatings();
        await checkCanRate();
      } else {
        alert(result.message || "Erreur lors de l'ajout de la note");
      }
    } catch (err) {
      console.error("Submit rating error:", err);
      alert("Une erreur est survenue");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleAddToCart = (productId: string, productName: string, price: number) => {
    addToCart({
      id: productId,
      name: productName,
      price: price,
    });
    alert(`${productName} ajouté au panier !`);
  };

  const handleCopyRipPost = async () => {
    if (supplierData?.supplier.rip_post) {
      try {
        await navigator.clipboard.writeText(supplierData.supplier.rip_post);
        setCopiedRipPost(true);
        setTimeout(() => setCopiedRipPost(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleCopyRipBank = async () => {
    if (supplierData?.supplier.rip_bank) {
      try {
        await navigator.clipboard.writeText(supplierData.supplier.rip_bank);
        setCopiedRipBank(true);
        setTimeout(() => setCopiedRipBank(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des détails du fournisseur...</p>
        </div>
      </div>
    );
  }

  if (error || !supplierData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-lg p-8 max-w-md">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fournisseur non trouvé</h2>
          <p className="text-gray-600 mb-6">{error || "Le fournisseur demandé n'existe pas"}</p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const { supplier, stats, products } = supplierData;
  
  // Ensure stats values are numbers (default to 0 if undefined)
  const totalProducts = stats?.totalProducts ?? 0;
  const displayedProducts = stats?.displayedProducts ?? products?.length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Détails du fournisseur</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Supplier Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Profile Image */}
              <div className="relative">
                {supplier.profileImage ? (
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
                    <img
                      src={getImageUrl(supplier.profileImage) || ""}
                      alt={`${supplier.firstName} ${supplier.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white shadow-xl flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                {supplier.status && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Supplier Info */}
              <div className="flex-1 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    {supplier.firstName} {supplier.lastName}
                  </h2>
                  {supplier.status && (
                    <span className="px-2 sm:px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Vérifié
                    </span>
                  )}
                </div>
                <p className="text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">Fournisseur certifié</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{supplier.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Produits</p>
                    <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        {(supplier.rip_post || supplier.rip_bank || (supplier.methode_payment && supplier.methode_payment.length > 0)) && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sm:p-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                Informations de paiement
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {supplier.methode_payment && supplier.methode_payment.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-600" />
                    Méthodes de paiement acceptées
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {supplier.methode_payment.map((method, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium text-sm"
                      >
                        {method === "cash" ? "Cash" : method === "by post" ? "Par Poste" : "Banque"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {supplier.rip_post && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    RIP Post
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded-lg">{supplier.rip_post}</p>
                    <button
                      onClick={handleCopyRipPost}
                      className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex-shrink-0"
                      title="Copier le numéro RIP Post"
                    >
                      {copiedRipPost ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              {supplier.rip_bank && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    RIP Bank
                  </h4>
                  <div className="flex items-center gap-2">
                    <p className="flex-1 text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded-lg">{supplier.rip_bank}</p>
                    <button
                      onClick={handleCopyRipBank}
                      className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors flex-shrink-0"
                      title="Copier le numéro RIP Bank"
                    >
                      {copiedRipBank ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ratings Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 p-4 sm:p-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 sm:w-6 sm:h-6" />
              Notes et Avis
            </h3>
          </div>
          
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Average Rating */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 rounded-xl gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                    {ratings && ratings.totalRatings > 0 ? ratings.averageRating : "0"}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const avgRating = ratings ? parseFloat(ratings.averageRating) : 0;
                      return (
                        <Star
                          key={star}
                          className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            star <= avgRating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {ratings?.totalRatings || 0} {ratings?.totalRatings === 1 ? "note" : "notes"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {ratings && ratings.totalRatings > 0
                      ? `Moyenne basée sur ${ratings.totalRatings} avis`
                      : "Nous n'avons pas encore de notes"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Form - Only show if user can rate */}
            {canRate !== null && !canRate.canRate && getAuthToken() && (
              <div className="border-t border-gray-200 pt-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    💡 Vous devez avoir effectué un achat auprès de ce fournisseur pour pouvoir le noter.
                  </p>
                </div>
              </div>
            )}

            {canRate?.canRate && (
              <div className="border-t border-gray-200 pt-4 sm:pt-6">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                  {canRate.hasRated ? "Modifier votre note" : "Ajouter une note"}
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note (sur 5)
                    </label>
                    <div className="flex items-center gap-1 sm:gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingNumber(star)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 sm:w-8 sm:h-8 ${
                              star <= ratingNumber
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 hover:text-yellow-200"
                            }`}
                          />
                        </button>
                      ))}
                      {ratingNumber > 0 && (
                        <span className="ml-2 text-xs sm:text-sm text-gray-600">
                          {ratingNumber}/5
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Votre avis
                    </label>
                    <textarea
                      value={ratingMessage}
                      onChange={(e) => setRatingMessage(e.target.value)}
                      placeholder="Partagez votre expérience avec ce fournisseur..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none resize-none"
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {ratingMessage.length}/1000 caractères
                    </p>
                  </div>
                  <button
                    onClick={handleSubmitRating}
                    disabled={isSubmittingRating || ratingNumber === 0 || !ratingMessage.trim()}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    {isSubmittingRating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {canRate.hasRated ? "Modifier la note" : "Envoyer la note"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Ratings List */}
            {isLoadingRatings ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : ratings && ratings.ratings.length > 0 ? (
              <div className="border-t border-gray-200 pt-4 sm:pt-6">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Tous les avis</h4>
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                  {ratings.ratings.map((rate) => (
                    <div
                      key={rate.id}
                      className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {rate.rater.firstName} {rate.rater.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(rate.createdAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= rate.number
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 mt-2">{rate.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t border-gray-200 pt-6 text-center py-8">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Nous n'avons pas encore d'avis</p>
                <p className="text-sm text-gray-500 mt-1">
                  Soyez le premier à noter ce fournisseur
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              Produits ({displayedProducts})
            </h2>
            {totalProducts > displayedProducts && (
              <p className="text-sm text-gray-600">
                Affichage de {displayedProducts} sur {totalProducts} produits
              </p>
            )}
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">Aucun produit disponible</p>
              <p className="text-gray-500 mt-2">Ce fournisseur n'a pas encore de produits en stock.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all group"
                >
                  {/* Product Image */}
                  <Link href={`/products/${product._id}`}>
                    <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={getImageUrl(product.images[0]) || ""}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          product.quantity > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {product.quantity > 0 ? "En stock" : "Rupture"}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-4">
                    <Link href={`/products/${product._id}`}>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                      <Tag className="w-3 h-3" />
                      <span className="truncate">{product.category}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                      <span className="font-medium">{product.brand}</span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xl font-bold text-blue-600">{product.price.toFixed(2)} DA</p>
                      <span className="text-xs text-gray-500">Qté: {product.quantity}</span>
                    </div>
                    <button
                      onClick={() => handleAddToCart(product._id, product.name, product.price)}
                      disabled={product.quantity === 0}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Ajouter au panier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
