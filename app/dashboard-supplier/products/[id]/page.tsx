"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Box,
  Tag,
  Clock,
  Building2,
  Image as ImageIcon,
  Video,
  Edit,
  Trash2,
  Percent,
  Loader2,
  AlertCircle,
  Play,
} from "lucide-react";
import { getSupplierProducts, Product, getAuthToken, updateProduct, deleteProduct } from "@/lib/api";

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  
  // Form state for editing
  const [editFormData, setEditFormData] = useState({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    category: "",
    deliveryTime: "",
    brand: "",
    productType: "Labo médical" as "Labo médical" | "labo d'ana pathologies",
    images: [] as File[],
    video: null as File | null,
  });

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
          router.push("/login");
          return;
        }

        const result = await getSupplierProducts();
        if (result.success && result.data) {
          const foundProduct = result.data.products.find((p) => p.id === productId);
          if (foundProduct) {
            setProduct(foundProduct);
            // Initialize edit form with product data
            setEditFormData({
              name: foundProduct.name,
              purchasePrice: foundProduct.purchasePrice.toString(),
              sellingPrice: foundProduct.sellingPrice.toString(),
              quantity: foundProduct.quantity.toString(),
              category: foundProduct.category,
              deliveryTime: foundProduct.deliveryTime,
              brand: foundProduct.brand,
              productType: foundProduct.productType,
              images: [],
              video: null,
            });
          } else {
            setError("Produit non trouvé");
          }
        } else {
          setError(result.message || "Erreur lors du chargement du produit");
        }
      } catch (err) {
        setError("Une erreur est survenue");
        console.error("Load product error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du produit...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600">{error || "Produit non trouvé"}</p>
        </div>
      </div>
    );
  }

  // Use base URL without /api for static files
  const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace('/api', '');
  const profit = product.sellingPrice - product.purchasePrice;
  const profitPercentage = product.purchasePrice > 0 ? ((profit / product.purchasePrice) * 100).toFixed(2) : "0";
  
  // Helper function to fix image paths
  const getImageUrl = (imagePath: string) => {
    let path = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    // Ensure path doesn't have double slashes
    return `${API_BASE_URL}/${path}`.replace(/([^:]\/)\/+/g, "$1");
  };
  
  // Helper function to fix video path
  const getVideoUrl = (videoPath?: string) => {
    if (!videoPath) return null;
    let path = videoPath.startsWith('/') ? videoPath.slice(1) : videoPath;
    // Ensure path doesn't have double slashes
    return `${API_BASE_URL}/${path}`.replace(/([^:]\/)\/+/g, "$1");
  };

  const handleDelete = async () => {
    if (!product) return;
    
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteProduct(product.id);
      if (result.success) {
        router.push("/dashboard-supplier/products");
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async () => {
    if (!product) return;

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const result = await updateProduct(product.id, {
        name: editFormData.name,
        purchasePrice: parseFloat(editFormData.purchasePrice),
        sellingPrice: parseFloat(editFormData.sellingPrice),
        quantity: parseInt(editFormData.quantity),
        category: editFormData.category,
        deliveryTime: editFormData.deliveryTime,
        brand: editFormData.brand,
        productType: editFormData.productType,
        images: editFormData.images.length > 0 ? editFormData.images : undefined,
        video: editFormData.video || undefined,
      });

      if (result.success) {
        setUpdateSuccess("Produit mis à jour avec succès");
        setIsEditing(false);
        // Reload product data
        const reloadResult = await getSupplierProducts();
        if (reloadResult.success && reloadResult.data) {
          const updatedProduct = reloadResult.data.products.find((p) => p.id === productId);
          if (updatedProduct) {
            setProduct(updatedProduct);
            setEditFormData({
              name: updatedProduct.name,
              purchasePrice: updatedProduct.purchasePrice.toString(),
              sellingPrice: updatedProduct.sellingPrice.toString(),
              quantity: updatedProduct.quantity.toString(),
              category: updatedProduct.category,
              deliveryTime: updatedProduct.deliveryTime,
              brand: updatedProduct.brand,
              productType: updatedProduct.productType,
              images: [],
              video: null,
            });
          }
        }
        setTimeout(() => setUpdateSuccess(null), 3000);
      } else {
        setUpdateError(result.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error("Update error:", err);
      setUpdateError("Une erreur est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      setEditFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageFiles].slice(0, 10),
      }));
    }
  };

  const removeImage = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setEditFormData((prev) => ({
        ...prev,
        video: file,
      }));
    }
  };

  const removeVideo = () => {
    setEditFormData((prev) => ({
      ...prev,
      video: null,
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Retour aux produits</span>
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Images and Video */}
        <div className="space-y-4">
          {/* Main Image/Video */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <div className="relative">
                <img
                  src={getImageUrl(product.images[selectedImageIndex])}
                  alt={product.name}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                  }}
                />
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() =>
                        setSelectedImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-700 rotate-180" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {product.images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === selectedImageIndex ? "bg-white w-8" : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-24 rounded-xl overflow-hidden border-2 transition-all ${
                    index === selectedImageIndex
                      ? "border-green-600 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3C/svg%3E';
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Video */}
          {product.video && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <Video className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Vidéo du produit</span>
              </div>
              <div className="relative">
                <video
                  src={getVideoUrl(product.video) || ''}
                  controls
                  className="w-full h-auto"
                  preload="metadata"
                >
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Product Details */}
        <div className="space-y-6">
          {/* Product Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      product.productType === "Labo médical"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {product.productType}
                  </span>
                </div>
                {product.quantity === 0 && (
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-2">
                    Rupture de stock
                  </span>
                )}
              </div>
            </div>

            {/* Brand and Category */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">{product.brand}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="font-medium">{product.category}</span>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border-2 border-green-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Informations de prix
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                <div className="flex items-center gap-2 text-gray-700">
                  <TrendingDown className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">Prix d'achat</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{product.purchasePrice.toFixed(2)} DA</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl">
                <div className="flex items-center gap-2 text-gray-700">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Prix de vente</span>
                </div>
                <span className="text-xl font-bold text-green-600">{product.sellingPrice.toFixed(2)} DA</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5" />
                  <span className="font-semibold">Bénéfice par unité</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">+{profit.toFixed(2)} DA</p>
                  <p className="text-sm text-green-100">({profitPercentage}% de marge)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock and Delivery */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Box className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stock disponible</p>
                  <p className="text-2xl font-bold text-gray-900">{product.quantity}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Délai de livraison</p>
                  <p className="text-lg font-bold text-gray-900">{product.deliveryTime}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {updateSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <p className="text-sm text-green-700">{updateSuccess}</p>
            </div>
          )}
          {updateError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-sm text-red-700">{updateError}</p>
            </div>
          )}

          {/* Edit Form or Actions */}
          {isEditing ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900">Modifier le produit</h3>
              </div>
              
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Informations de base</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du produit</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                    <input
                      type="text"
                      value={editFormData.brand}
                      onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <input
                      type="text"
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de produit</label>
                    <select
                      value={editFormData.productType}
                      onChange={(e) => setEditFormData({ ...editFormData, productType: e.target.value as "Labo médical" | "labo d'ana pathologies" })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black bg-white"
                    >
                      <option value="Labo médical">Labo médical</option>
                      <option value="labo d'ana pathologies">labo d'ana pathologies</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Prix et stock</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix d'achat (DA)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.purchasePrice}
                      onChange={(e) => setEditFormData({ ...editFormData, purchasePrice: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente (DA)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.sellingPrice}
                      onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
                    <input
                      type="number"
                      value={editFormData.quantity}
                      onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Livraison</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Délai de livraison</label>
                  <input
                    type="text"
                    value={editFormData.deliveryTime}
                    onChange={(e) => setEditFormData({ ...editFormData, deliveryTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  />
                </div>
              </div>

              {/* Media Section */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Médias</h4>
                
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelles images (optionnel)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  />
                  {editFormData.images.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {editFormData.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={URL.createObjectURL(img)} alt={`Preview ${idx}`} className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouvelle vidéo (optionnel)</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                  />
                  {editFormData.video && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <p className="text-sm text-gray-700 font-medium">{editFormData.video.name}</p>
                      <button
                        onClick={removeVideo}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Mise à jour...</span>
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setUpdateError(null);
                    setUpdateSuccess(null);
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Edit className="w-5 h-5" />
                <span>Modifier</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

