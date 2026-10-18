"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Clock,
  Building2,
  Tag,
  Image as ImageIcon,
  Video,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  LogIn,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { getProductById, PublicProduct, getSessionRole } from "@/lib/api";
import LoginAlert from "@/components/LoginAlert";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import CatalogPrice from "@/components/CatalogPrice";
import CartPanel from "@/components/CartPanel";
import UniqueDataFields from "@/components/UniqueDataFields";
import SupplierNameGate from "@/components/SupplierNameGate";
import BackButton from "@/components/BackButton";
import { getMediaUrl as buildMediaUrl } from "@/lib/media-url";
import { productToUniqueData } from "@/lib/unique-data-display";
import SupplierDeliveryNotes from "@/components/SupplierDeliveryNotes";
import QuantityInput from "@/components/QuantityInput";
import { useUserLocation } from "@/hooks/useUserLocation";
import { resolveWilayaCode } from "@/lib/algeria-wilayas";

const getMediaUrl = (mediaPath: string) => {
  return buildMediaUrl(mediaPath) || "";
};

const CARD = "bg-white rounded-2xl border border-gray-200 shadow-sm lg:shadow-lg p-4 sm:p-6";

export default function ProductDetailPage() {
  const params = useParams();
  const { addToCart } = useCart();
  const productId = params.id as string;
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginAlertOpen, setLoginAlertOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { location } = useUserLocation();
  const visitorWilayaCode = resolveWilayaCode(location?.wilaya);

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSessionRole();
      if (session) {
        setUserRole(session.role);
        setIsAuthenticated(session.role === "client");
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
            // If product has only video (no images), set selectedImageIndex to -1
            if (result.data.video && (!result.data.images || result.data.images.length === 0)) {
              setSelectedImageIndex(-1);
            }
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
      const stock = typeof product.quantity === "number" ? product.quantity : undefined;
      addToCart(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          supplierId: product.supplier?.id || "",
          itemType: "product",
          maxQuantity: stock,
        },
        quantity
      );
      setCartOpen(true);
    } else {
      setLoginAlertOpen(true);
    }
  };

  if (isLoading) {
    return <AppLoadingScreen />;
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
            Le produit que vous recherchez n&apos;existe pas ou n&apos;est plus disponible.
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

  const mainImage =
    selectedImageIndex === -1
      ? null // Video is selected
      : product.images && product.images.length > 0
      ? getMediaUrl(product.images[selectedImageIndex])
      : null;
  const outOfStock = product.quantity === 0;
  const mediaBox = "w-full aspect-square sm:aspect-auto sm:h-80 md:h-96";

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(6rem+var(--lab-nav-offset,0px))] lg:pb-0">
      {/* App bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex h-14 sm:h-16 items-center gap-1 px-2 sm:px-6 lg:px-8">
          <BackButton
            fallbackHref="/products"
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 sm:px-3 text-gray-700 active:bg-gray-100 sm:hover:text-blue-600 transition-colors group"
            iconClassName="w-5 h-5 sm:group-hover:-translate-x-1 transition-transform"
            label={<span className="hidden sm:inline">Retour</span>}
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 lg:hidden">
            {product.name}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-0 sm:px-6 lg:px-8 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-3 sm:gap-8 lg:gap-12">
          {/* Media */}
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white sm:rounded-2xl sm:shadow-lg sm:border sm:border-gray-200 overflow-hidden">
              {selectedImageIndex === -1 && product.video ? (
                <div className="relative">
                  <video
                    controls
                    src={getMediaUrl(product.video)}
                    className={`${mediaBox} object-contain bg-black`}
                  />
                  <div className="absolute top-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-md flex items-center gap-2 text-sm">
                    <Video className="w-4 h-4" />
                    <span>Vidéo du produit</span>
                  </div>
                </div>
              ) : product.images && product.images.length > 0 ? (
                <div className="relative">
                  <img
                    src={mainImage || ""}
                    alt={product.name}
                    className={`${mediaBox} object-cover`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  {(product.images.length > 1 || product.video) && (
                    <>
                      <button
                        type="button"
                        aria-label="Image précédente"
                        onClick={() => {
                          if (product.images && product.images.length > 0) {
                            setSelectedImageIndex((prev) => {
                              if (prev === -1) return product.images!.length - 1;
                              return prev === 0 ? (product.video ? -1 : product.images!.length - 1) : prev - 1;
                            });
                          } else if (product.video) {
                            setSelectedImageIndex(-1);
                          }
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md active:bg-white sm:bg-black/50 sm:text-white sm:hover:bg-black/70"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Image suivante"
                        onClick={() => {
                          if (product.images && product.images.length > 0) {
                            setSelectedImageIndex((prev) => {
                              if (prev === product.images!.length - 1) return product.video ? -1 : 0;
                              return prev + 1;
                            });
                          } else if (product.video) {
                            setSelectedImageIndex(-1);
                          }
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-gray-800 shadow-md active:bg-white sm:bg-black/50 sm:text-white sm:hover:bg-black/70"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 rounded-full bg-black/30 px-2 py-1">
                    {product.images.map((_, index) => (
                      <span
                        key={index}
                        className={`h-2 rounded-full transition-all ${
                          index === selectedImageIndex ? "w-4 bg-white" : "w-2 bg-white/60"
                        }`}
                      />
                    ))}
                    {product.video && (
                      <span
                        className={`h-2 rounded-full transition-all ${
                          selectedImageIndex === -1 ? "w-4 bg-white" : "w-2 bg-white/60"
                        }`}
                      />
                    )}
                  </div>
                </div>
              ) : product.video ? (
                <video controls src={getMediaUrl(product.video)} className={`${mediaBox} object-cover`}></video>
              ) : (
                <div className={`${mediaBox} flex items-center justify-center bg-gray-200 text-gray-400`}>
                  <ImageIcon className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
                </div>
              )}
            </div>

            {/* Thumbnails — swipeable row */}
            {((product.images && product.images.length > 1) || (product.video && product.images && product.images.length > 0)) && (
              <div className="flex gap-2 overflow-x-auto px-3 sm:px-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {product.images?.map((imagePath, index) => (
                  <button
                    type="button"
                    key={`img-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      index === selectedImageIndex ? "border-blue-500" : "border-gray-200"
                    } sm:hover:border-blue-400`}
                  >
                    <img
                      src={getMediaUrl(imagePath)}
                      alt={`Miniature ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </button>
                ))}
                {product.video && (
                  <button
                    type="button"
                    onClick={() => setSelectedImageIndex(-1)}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      selectedImageIndex === -1 ? "border-blue-500" : "border-gray-200"
                    }`}
                  >
                    <video src={getMediaUrl(product.video)} className="h-full w-full object-cover" muted />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <Video className="h-5 w-5 text-white" />
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 sm:space-y-6 px-3 sm:px-0">
            {/* Title */}
            <div className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {userRole ? (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-[11px] sm:text-xs font-semibold">
                        {product.category}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${
                          product.productType === "Labo médical"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {product.productType}
                      </span>
                    </div>
                  ) : null}
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-bold leading-snug text-gray-900">
                    {product.name}
                  </h1>
                  {userRole ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600 text-xs sm:text-sm">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {product.brand}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {product.deliveryTime}
                      </span>
                    </div>
                  ) : null}
                </div>
                {userRole ? (
                  <span
                    className={`shrink-0 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-sm font-semibold ${
                      outOfStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {outOfStock ? "Rupture" : "En stock"}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3 lg:hidden">
                <CatalogPrice
                  amount={product.price}
                  visible={Boolean(userRole)}
                  className="text-2xl font-bold text-blue-600"
                />
              </div>
            </div>

            {/* Details */}
            <div className={CARD}>
              <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Détails</h2>
              <UniqueDataFields
                data={productToUniqueData(product)}
                max={40}
                guestOnly={!userRole}
                hidePrices={!userRole}
                className="max-h-none"
              />
            </div>

            {/* Price — desktop (phone shows it in the title card) */}
            <div className={`${CARD} hidden lg:block`}>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Prix</h2>
              <CatalogPrice
                amount={product.price}
                visible={Boolean(userRole)}
                className="text-3xl sm:text-4xl font-bold text-blue-600"
              />
            </div>

            {/* Supplier */}
            {product.supplier && (
              <div className={CARD}>
                <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span>Fournisseur</span>
                </h2>
                <SupplierNameGate visible={Boolean(userRole)}>
                  <div className="space-y-1">
                    <Link
                      href={`/supplier/${product.supplier.id}`}
                      className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50 sm:hover:bg-gray-50 transition-colors group"
                    >
                      <Building2 className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Nom</p>
                        <p className="truncate font-semibold text-gray-900 group-hover:text-blue-600">
                          {product.supplier.name}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </Link>
                    {product.supplier.email && (
                      <a
                        href={`mailto:${product.supplier.email}`}
                        className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50"
                      >
                        <Mail className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="truncate font-semibold text-gray-900">{product.supplier.email}</p>
                        </div>
                      </a>
                    )}
                    {product.supplier.phone && (
                      <a
                        href={`tel:${product.supplier.phone}`}
                        className="flex min-h-12 items-center gap-3 rounded-xl p-2 active:bg-gray-50"
                      >
                        <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Téléphone</p>
                          <p className="font-semibold text-gray-900">{product.supplier.phone}</p>
                        </div>
                      </a>
                    )}
                    {product.supplier.address && (
                      <div className="flex items-center gap-3 p-2">
                        <MapPin className="w-5 h-5 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Adresse</p>
                          <p className="font-semibold text-gray-900">{product.supplier.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </SupplierNameGate>
              </div>
            )}

            {userRole ? (
              <>
                {/* Stock & Delivery */}
                <div className={CARD}>
                  <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Stock & Livraison</h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2.5 sm:gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-sm text-gray-600">En stock</p>
                        <p className="text-base sm:text-xl font-bold text-blue-700">{product.quantity}</p>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center gap-2.5 sm:gap-3">
                      <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-sm text-gray-600">Livraison</p>
                        <p className="truncate text-sm sm:text-xl font-bold text-yellow-700">{product.deliveryTime}</p>
                      </div>
                    </div>
                  </div>
                  {product.supplier && (
                    <div className="mt-4">
                      <SupplierDeliveryNotes
                        deliveryNoteAll={product.supplier.deliveryNoteAll}
                        deliveryByWilaya={product.supplier.deliveryByWilaya}
                        wilayas={product.supplier.wilayas}
                        coversAllWilayas={product.supplier.coversAllWilayas}
                        highlightWilayaCode={visitorWilayaCode}
                      />
                    </div>
                  )}
                </div>

                {/* Quantity and Add to Cart — desktop (phone uses the bottom bar) */}
                <div className={`${CARD} hidden lg:block space-y-4`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
                    <QuantityInput
                      value={quantity}
                      onChange={setQuantity}
                      max={typeof product.quantity === "number" ? product.quantity : undefined}
                      disabled={outOfStock}
                    />
                    {product.quantity > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {product.quantity} disponible{product.quantity > 1 ? "s" : ""}
                        {quantity >= product.quantity && " — quantité maximale atteinte"}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    {outOfStock ? "Rupture de stock" : "Ajouter au panier"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </main>

      {/* Phone action bar */}
      <div className="app-action-bar fixed inset-x-0 z-30 border-t border-gray-200 bg-white/95 px-3 pt-2.5 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden">
        {userRole ? (
          <div className="flex items-center gap-2.5">
            <QuantityInput
              size="sm"
              value={quantity}
              onChange={setQuantity}
              max={typeof product.quantity === "number" ? product.quantity : undefined}
              disabled={outOfStock}
            />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 text-sm font-semibold text-white shadow-md active:opacity-90 disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              {outOfStock ? "Rupture de stock" : "Ajouter au panier"}
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-sm font-semibold text-white shadow-md active:opacity-90"
          >
            <LogIn className="h-4 w-4" />
            Se connecter pour voir le prix et réserver
          </Link>
        )}
      </div>

      <CartPanel isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <LoginAlert isOpen={loginAlertOpen} onClose={() => setLoginAlertOpen(false)} />
    </div>
  );
}
