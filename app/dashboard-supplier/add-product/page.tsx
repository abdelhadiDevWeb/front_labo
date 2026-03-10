"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Upload,
  FileSpreadsheet,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Box,
  Clock,
  Tag,
  Building2,
  ChevronDown,
  Image as ImageIcon,
  Video,
  TrendingDown,
  Percent,
} from "lucide-react";
import { getAuthToken } from "@/lib/api";

interface ProductFormData {
  name: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: string;
  category: string;
  deliveryTime: string;
  brand: string;
  productType: "Labo médical" | "labo d'ana pathologies";
  images: File[];
  video: File | null;
}

export default function AddProductPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"single" | "excel">("single");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    category: "",
    deliveryTime: "",
    brand: "",
    productType: "Labo médical",
    images: [],
    video: null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length !== files.length) {
        setError("Seuls les fichiers image sont acceptés");
      }
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageFiles].slice(0, 10), // Max 10 images
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Seuls les fichiers vidéo sont acceptés");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("La taille de la vidéo ne doit pas dépasser 50MB");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        video: file,
      }));
    }
  };

  const removeVideo = () => {
    setFormData((prev) => ({
      ...prev,
      video: null,
    }));
    const videoInput = document.getElementById("video") as HTMLInputElement;
    if (videoInput) videoInput.value = "";
  };

  // Calculate profit
  const calculateProfit = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (selling > 0 && purchase > 0) {
      const profit = selling - purchase;
      const profitPercentage = ((profit / purchase) * 100).toFixed(2);
      return { profit, profitPercentage };
    }
    return { profit: 0, profitPercentage: "0" };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedExtensions = [".xlsx", ".xls"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      
      if (!allowedExtensions.includes(fileExtension)) {
        setError("Seuls les fichiers Excel (.xlsx, .xls) sont acceptés");
        setExcelFile(null);
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError("La taille du fichier ne doit pas dépasser 10MB");
        setExcelFile(null);
        return;
      }

      setExcelFile(file);
      setError(null);
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFilesArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imageFilesArray.length !== files.length) {
        setError("Seuls les fichiers image sont acceptés");
        return;
      }
      setImageFiles(imageFilesArray);
      setError(null);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

      // Create FormData for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("purchasePrice", formData.purchasePrice);
      formDataToSend.append("sellingPrice", formData.sellingPrice);
      formDataToSend.append("quantity", formData.quantity);
      formDataToSend.append("category", formData.category.trim());
      formDataToSend.append("deliveryTime", formData.deliveryTime.trim());
      formDataToSend.append("brand", formData.brand.trim());
      formDataToSend.append("productType", formData.productType);

      // Append images
      formData.images.forEach((image) => {
        formDataToSend.append("images", image);
      });

      // Append video if exists
      if (formData.video) {
        formDataToSend.append("video", formData.video);
      }

      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        // Display specific validation errors if available
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de la création du produit");
        }
        setIsLoading(false);
        return;
      }

      if (result.success) {
        setSuccess("Produit créé avec succès !");
        // Reset form
        setFormData({
          name: "",
          purchasePrice: "",
          sellingPrice: "",
          quantity: "",
          category: "",
          deliveryTime: "",
          brand: "",
          productType: "Labo médical",
          images: [],
          video: null,
        });
        // Reset file inputs
        const imageInput = document.getElementById("images") as HTMLInputElement;
        const videoInput = document.getElementById("video") as HTMLInputElement;
        if (imageInput) imageInput.value = "";
        if (videoInput) videoInput.value = "";
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        // Display specific validation errors if available
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de la création du produit");
        }
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      console.error("Create product error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const response = await fetch(`${API_BASE_URL}/products/download-template`, {
        method: "GET",
      });

      if (!response.ok) {
        setError("Erreur lors du téléchargement du modèle");
        return;
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "modele_produits.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess("Modèle Excel téléchargé avec succès !");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Download template error:", err);
      setError("Erreur lors du téléchargement du modèle");
    }
  };

  const handleExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!excelFile) {
      setError("Veuillez sélectionner un fichier Excel");
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

      const formData = new FormData();
      formData.append("excelFile", excelFile);
      
      // Append all image files
      imageFiles.forEach((imageFile) => {
        formData.append("images", imageFile);
      });

      const response = await fetch(`${API_BASE_URL}/products/upload-excel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Display specific validation errors if available
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de l'upload du fichier");
        }
        setIsLoading(false);
        return;
      }

      if (result.success) {
        let successMessage = `Importation réussie ! ${result.data.imported} produit(s) importé(s) sur ${result.data.total}`;
        
        // Show column mapping if available
        if (result.data.columnMapping) {
          const mappings = Object.entries(result.data.columnMapping)
            .map(([eng, fr]) => `${fr} = ${eng}`)
            .join(", ");
          successMessage += `\n\nColonnes mappées: ${mappings}`;
        }
        
        setSuccess(successMessage);
        setExcelFile(null);
        // Reset file input
        const fileInput = document.getElementById("excelFile") as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        // Display errors if any
        if (result.errorDetails && result.errorDetails.length > 0) {
          setUploadErrors(result.errorDetails);
        } else {
          setUploadErrors([]);
        }
      } else {
        // Display errors from backend with column mapping info
        let errorMessage = result.message || "Erreur lors de l'upload du fichier";
        
        if (result.columnMapping) {
          const mappings = Object.entries(result.columnMapping)
            .map(([eng, fr]) => `${fr} = ${eng}`)
            .join(", ");
          errorMessage += `\n\nColonnes détectées: ${mappings}`;
        }
        
        if (result.foundColumns) {
          errorMessage += `\n\nColonnes trouvées dans le fichier: ${result.foundColumns.join(", ")}`;
        }
        
        // Display errors from backend
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setUploadErrors(result.errors);
          setError(errorMessage);
        } else {
          setError(errorMessage);
          setUploadErrors([]);
        }
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setUploadErrors([]);
      console.error("Upload Excel error:", err);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Gradient */}
      <div className="relative bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 rounded-2xl p-8 shadow-xl overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Ajouter un Produit</h1>
              <p className="text-green-100 text-sm sm:text-base">
                Créez un nouveau produit ou importez plusieurs produits depuis Excel
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Rapide</span>
              </div>
              <p className="text-white font-bold text-lg">Ajout unique</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Bulk</span>
              </div>
              <p className="text-white font-bold text-lg">Import Excel</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Efficace</span>
              </div>
              <p className="text-white font-bold text-lg">Gestion</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>Sécurisé</span>
              </div>
              <p className="text-white font-bold text-lg">Validé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector - Modern Design */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-2">
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActiveTab("single");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
              activeTab === "single"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-105"
                : "text-gray-700 hover:bg-gray-50 hover:scale-102"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeTab === "single" ? "bg-white/20" : "bg-green-100"}`}>
              <Plus className={`w-5 h-5 ${activeTab === "single" ? "text-white" : "text-green-600"}`} />
            </div>
            <span className="text-sm sm:text-base">Ajouter un par un</span>
            {activeTab === "single" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("excel");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 relative overflow-hidden group ${
              activeTab === "excel"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-105"
                : "text-gray-700 hover:bg-gray-50 hover:scale-102"
            }`}
          >
            <div className={`p-2 rounded-lg ${activeTab === "excel" ? "bg-white/20" : "bg-green-100"}`}>
              <FileSpreadsheet className={`w-5 h-5 ${activeTab === "excel" ? "text-white" : "text-green-600"}`} />
            </div>
            <span className="text-sm sm:text-base">Importer depuis Excel</span>
            {activeTab === "excel" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            )}
          </button>
        </div>
      </div>

      {/* Messages - Enhanced Design */}
      {success && (
        <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-xl shadow-lg flex items-start gap-4 animate-fade-in-up">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-900 mb-1">Succès !</p>
            <p className="text-sm text-green-700 whitespace-pre-line">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 rounded-xl shadow-lg flex items-start gap-4 animate-fade-in-up">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-900 mb-1">Erreur</p>
            <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {/* Single Product Form */}
      {activeTab === "single" && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Formulaire d'ajout</h2>
                <p className="text-sm text-gray-600">Remplissez les informations du produit</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSingleSubmit} className="p-6 sm:p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Package className="w-4 h-4 text-green-600" />
                  <span>Nom du produit</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="Ex: Analyse de sang complète"
                  />
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Purchase Price */}
              <div>
                <label htmlFor="purchasePrice" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span>Prix d'achat (DA)</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="purchasePrice"
                    name="purchasePrice"
                    required
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="0.00"
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Selling Price */}
              <div>
                <label htmlFor="sellingPrice" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>Prix de vente (DA)</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="sellingPrice"
                    name="sellingPrice"
                    required
                    min="0"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="0.00"
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Profit Display */}
              {formData.purchasePrice && formData.sellingPrice && parseFloat(formData.sellingPrice) >= parseFloat(formData.purchasePrice) && (
                <div className="md:col-span-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Percent className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Bénéfice estimé</p>
                        <p className="text-xs text-gray-500">Par unité vendue</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        +{calculateProfit().profit.toFixed(2)} DA
                      </p>
                      <p className="text-sm text-gray-600">
                        ({calculateProfit().profitPercentage}% de marge)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Box className="w-4 h-4 text-green-600" />
                  <span>Quantité</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    required
                    min="0"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="0"
                  />
                  <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Tag className="w-4 h-4 text-green-600" />
                  <span>Catégorie</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="Ex: Analyses médicales"
                  />
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <label htmlFor="deliveryTime" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span>Délai de livraison</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="deliveryTime"
                    name="deliveryTime"
                    required
                    value={formData.deliveryTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="Ex: 24-48 heures"
                  />
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Brand */}
              <div>
                <label htmlFor="brand" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Building2 className="w-4 h-4 text-green-600" />
                  <span>Marque</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="brand"
                    name="brand"
                    required
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400"
                    placeholder="Ex: LaboPro"
                  />
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>

              {/* Product Type */}
              <div>
                <label htmlFor="productType" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Package className="w-4 h-4 text-green-600" />
                  <span>Type de produit</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="productType"
                    name="productType"
                    required
                    value={formData.productType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 pl-11 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white hover:border-gray-400 appearance-none cursor-pointer"
                  >
                    <option value="Labo médical">Labo médical</option>
                    <option value="labo d'ana pathologies">labo d'ana pathologies</option>
                  </select>
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Images Upload */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <ImageIcon className="w-4 h-4 text-green-600" />
                  <span>Images du produit</span>
                  <span className="text-xs text-gray-500">(Jusqu'à 10 images)</span>
                </label>
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center">
                      <ImageIcon className="w-8 h-8 mb-2 text-gray-400 group-hover:text-green-600 transition-colors" />
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Cliquez pour ajouter</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Images uniquement - MAX. 50MB par image</p>
                    </div>
                    <input
                      type="file"
                      id="images"
                      name="images"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  
                  {/* Image Preview */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-xl border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-xl truncate">
                            {image.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Video Upload */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Video className="w-4 h-4 text-green-600" />
                  <span>Vidéo du produit</span>
                  <span className="text-xs text-gray-500">(Optionnel - 1 vidéo max)</span>
                </label>
                {formData.video ? (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Video className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formData.video.name}</p>
                          <p className="text-xs text-gray-500">
                            {(formData.video.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeVideo}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                    <div className="flex flex-col items-center justify-center">
                      <Video className="w-8 h-8 mb-2 text-gray-400 group-hover:text-green-600 transition-colors" />
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Cliquez pour ajouter</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Vidéo (mp4, mov, avi) - MAX. 50MB</p>
                    </div>
                    <input
                      type="file"
                      id="video"
                      name="video"
                      accept="video/*"
                      onChange={handleVideoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                    <span className="relative z-10">Création en cours...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="relative z-10">Créer le produit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Upload Form */}
      {activeTab === "excel" && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Excel Form Header */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Importation Excel</h2>
                <p className="text-sm text-gray-600">Importez plusieurs produits en une seule fois</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Format Info - Enhanced */}
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-200 rounded-2xl shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-blue-900 mb-2 text-lg">Format Excel requis</h3>
                      <p className="text-sm text-blue-700">
                        Votre fichier Excel doit contenir les colonnes suivantes (dans l'ordre) :
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                    >
                      <FileText className="w-4 h-4" />
                      Télécharger le modèle
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {[
                      { label: "nom", desc: "Nom du produit", english: "name" },
                      { label: "brand", desc: "Marque", english: "brand" },
                      { label: "quantité", desc: "Quantité", english: "quantity" },
                      { label: "prix d'achat", desc: "Prix d'achat en DA", english: "purchasePrice" },
                      { label: "délai de livraison", desc: "Délai de livraison (optionnel)", english: "deliveryTime" },
                      { label: "prix vente", desc: "Prix de vente en DA", english: "sellingPrice" },
                      { label: "category", desc: "Catégorie", english: "category" },
                      { label: "type", desc: 'Type: "Labo médical" ou "labo d\'ana pathologies"', english: "productType" },
                      { label: "conditionnement", desc: "Conditionnement", english: "conditionnement" },
                      { label: "images", desc: "Noms des images (séparés par virgule, optionnel)", english: "images" },
                    ].map((col, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-blue-100"
                      >
                        <div className="w-6 h-6 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-blue-900">{col.label}</span>
                          <p className="text-xs text-blue-700">{col.desc}</p>
                          {col.english !== col.label && (
                            <p className="text-xs text-gray-500 italic">({col.english})</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleExcelSubmit} className="space-y-6">
              <div>
                <label htmlFor="excelFile" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Fichier Excel</span>
                  <span className="text-red-500">*</span>
                </label>
                {excelFile ? (
                  <div className="flex items-center justify-between p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                        <FileSpreadsheet className="w-7 h-7 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">{excelFile.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span>{(excelFile.size / 1024).toFixed(2)} KB</span>
                          <span className="px-2 py-0.5 bg-green-200 text-green-700 rounded-full font-medium">
                            Prêt à importer
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExcelFile(null);
                        const fileInput = document.getElementById("excelFile") as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 transition-all duration-300 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                        <Upload className="w-10 h-10 text-blue-600 group-hover:text-green-600 transition-colors" />
                      </div>
                      <p className="mb-2 text-sm font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                        Cliquez pour télécharger
                      </p>
                      <p className="text-xs text-gray-500 mb-1">ou glissez-déposez votre fichier ici</p>
                      <p className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
                        Excel uniquement (.xlsx, .xls) - MAX. 10MB
                      </p>
                    </div>
                    <input
                      type="file"
                      id="excelFile"
                      name="excelFile"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Images Folder Upload */}
              <div>
                <label htmlFor="productImages" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Dossier d'images (optionnel)</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Sélectionnez toutes les images qui correspondent aux noms dans la colonne "images" de votre fichier Excel
                </p>
                {imageFiles.length > 0 ? (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">
                          {imageFiles.length} image(s) sélectionnée(s)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFiles([]);
                          const imagesInput = document.getElementById("productImages") as HTMLInputElement;
                          if (imagesInput) imagesInput.value = "";
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                      {imageFiles.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <span className="text-xs text-white text-center px-1 truncate w-full">{file.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 transition-all duration-300 group">
                    <div className="flex flex-col items-center justify-center pt-3 pb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300">
                        <ImageIcon className="w-8 h-8 text-blue-600 group-hover:text-green-600 transition-colors" />
                      </div>
                      <p className="mb-1 text-sm font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                        Cliquez pour sélectionner les images
                      </p>
                      <p className="text-xs text-gray-500">ou glissez-déposez plusieurs images</p>
                    </div>
                    <input
                      type="file"
                      id="productImages"
                      name="productImages"
                      accept="image/*"
                      multiple
                      onChange={handleImagesChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Upload Progress */}
              {isLoading && (
                <div className="space-y-3 p-5 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <div className="flex items-center justify-between text-sm font-semibold text-blue-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importation en cours...
                    </span>
                    <span className="font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading || !excelFile}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin relative z-10" />
                      <span className="relative z-10">Importation en cours...</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-6 h-6 relative z-10 group-hover:scale-110 transition-transform duration-300" />
                      <span className="relative z-10">Importer les produits</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

