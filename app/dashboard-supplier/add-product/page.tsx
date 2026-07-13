"use client";

import { useState, useEffect } from "react";
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
  Image as ImageIcon,
  Cpu,
  Wrench,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { apiFetch, getPublicCategories, Category } from "@/lib/api";
import { getApiUrl } from "@/lib/api-config";
import { getMediaUrl } from "@/lib/media-url";
import {
  SingleCatalogType,
  MACHINE_COLUMNS,
  SERVICE_COLUMNS,
  PRODUCT_COLUMNS,
  editableFieldsForType,
  typeHasFicheTechnique,
  catalogTypeToCategoryKind,
  createEndpointForType,
} from "@/lib/catalog-form-fields";

type ExcelImportType = SingleCatalogType | null;

type CategoryKind = "machine" | "services" | "product";

const excelTypeToCategoryType = (type: ExcelImportType): CategoryKind | null => {
  if (!type) return null;
  return catalogTypeToCategoryKind(type);
};

export default function AddProductPage() {
  const [activeTab, setActiveTab] = useState<"single" | "excel">("single");
  const [excelImportType, setExcelImportType] = useState<ExcelImportType>(null);
  const [excelCategoryId, setExcelCategoryId] = useState("");
  const [excelSousCategoryId, setExcelSousCategoryId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // One-by-one form state
  const [singleType, setSingleType] = useState<SingleCatalogType | null>(null);
  const [singleCategoryId, setSingleCategoryId] = useState("");
  const [singleSousCategoryId, setSingleSousCategoryId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [singleImages, setSingleImages] = useState<File[]>([]);
  const [fichePdf, setFichePdf] = useState<File | null>(null);

  const resetExcelImportState = () => {
    setExcelFile(null);
    setImageFiles([]);
    setPdfFiles([]);
    setUploadProgress(0);
    setUploadErrors([]);
    setError(null);
    setSuccess(null);
    setExcelCategoryId("");
    setExcelSousCategoryId("");
  };

  const resetSingleForm = () => {
    setFieldValues({});
    setSingleImages([]);
    setFichePdf(null);
    setSingleCategoryId("");
    setSingleSousCategoryId("");
  };

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const result = await getPublicCategories();
        if (result.success && result.data) {
          setCategories(result.data.categories);
        } else {
          setError(result.message || "Erreur lors du chargement des catégories");
        }
      } catch (err) {
        console.error("Load categories error:", err);
        setError("Impossible de charger les catégories");
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  const excelCategoryType = excelTypeToCategoryType(excelImportType);
  const excelFilteredCategories = excelCategoryType
    ? categories.filter((c) => (c.type_catgory || "product") === excelCategoryType)
    : [];
  const selectedExcelCategory = excelFilteredCategories.find((c) => c.id === excelCategoryId);
  const excelSousCategories = selectedExcelCategory?.sousCategories ?? [];
  const hasExcelSousCategories = excelSousCategories.length > 0;
  const selectedExcelSousCategory = excelSousCategories.find((sc) => sc.id === excelSousCategoryId);
  const showExcelUploadSection =
    !!selectedExcelCategory && (!hasExcelSousCategories || !!excelSousCategoryId);

  const excelColumnsForType =
    excelImportType === "machine"
      ? MACHINE_COLUMNS
      : excelImportType === "service"
        ? SERVICE_COLUMNS
        : PRODUCT_COLUMNS;

  const singleCategoryKind = singleType ? catalogTypeToCategoryKind(singleType) : null;
  const singleFilteredCategories = singleCategoryKind
    ? categories.filter((c) => (c.type_catgory || "product") === singleCategoryKind)
    : [];
  const selectedSingleCategory = singleFilteredCategories.find((c) => c.id === singleCategoryId);
  const singleSousCategories = selectedSingleCategory?.sousCategories ?? [];
  const hasSingleSousCategories = singleSousCategories.length > 0;
  const selectedSingleSousCategory = singleSousCategories.find(
    (sc) => sc.id === singleSousCategoryId
  );
  const showSingleFields =
    !!selectedSingleCategory && (!hasSingleSousCategories || !!singleSousCategoryId);
  const singleEditableFields = singleType ? editableFieldsForType(singleType) : [];
  const showFicheUpload = singleType ? typeHasFicheTechnique(singleType) : false;

  const handlePickExcelCategory = (categoryId: string) => {
    setExcelCategoryId(categoryId);
    setExcelSousCategoryId("");
    setExcelFile(null);
    setImageFiles([]);
    setPdfFiles([]);
    setUploadErrors([]);
  };

  const handlePickExcelSousCategory = (sousCategoryId: string) => {
    setExcelSousCategoryId(sousCategoryId);
    setExcelFile(null);
    setImageFiles([]);
    setPdfFiles([]);
    setUploadErrors([]);
  };

  const handleExcelBack = () => {
    if (showExcelUploadSection && hasExcelSousCategories) {
      setExcelSousCategoryId("");
      setExcelFile(null);
      setImageFiles([]);
      setPdfFiles([]);
      return;
    }
    if (excelCategoryId) {
      setExcelCategoryId("");
      setExcelSousCategoryId("");
      setExcelFile(null);
      setImageFiles([]);
      setPdfFiles([]);
      return;
    }
    setExcelImportType(null);
    resetExcelImportState();
  };

  const handlePickSingleCategory = (categoryId: string) => {
    setSingleCategoryId(categoryId);
    setSingleSousCategoryId("");
    setFieldValues({});
    setSingleImages([]);
    setFichePdf(null);
  };

  const handlePickSingleSousCategory = (sousCategoryId: string) => {
    setSingleSousCategoryId(sousCategoryId);
    setFieldValues({});
    setSingleImages([]);
    setFichePdf(null);
  };

  const handleSingleBack = () => {
    if (showSingleFields && hasSingleSousCategories) {
      setSingleSousCategoryId("");
      setFieldValues({});
      setSingleImages([]);
      setFichePdf(null);
      return;
    }
    if (singleCategoryId) {
      setSingleCategoryId("");
      setSingleSousCategoryId("");
      setFieldValues({});
      setSingleImages([]);
      setFichePdf(null);
      return;
    }
    setSingleType(null);
    resetSingleForm();
  };

  const handleFieldChange = (label: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [label]: value }));
  };

  const handleSingleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imgs = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (imgs.length !== files.length) {
        setError("Seuls les fichiers image sont acceptés");
      }
      setSingleImages((prev) => [...prev, ...imgs].slice(0, 10));
    }
  };

  const removeSingleImage = (index: number) => {
    setSingleImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFichePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Seuls les fichiers PDF sont acceptés pour la fiche technique");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("La fiche technique PDF ne doit pas dépasser 20MB");
      return;
    }
    setFichePdf(file);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExtensions = [".xlsx", ".xls"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

      if (!allowedExtensions.includes(fileExtension)) {
        setError("Seuls les fichiers Excel (.xlsx, .xls) sont acceptés");
        setExcelFile(null);
        return;
      }

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

  const handlePdfsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const pdfFilesArray = Array.from(files).filter(
        (file) =>
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
      );
      if (pdfFilesArray.length !== files.length) {
        setError("Seuls les fichiers PDF sont acceptés pour la fiche technique");
        return;
      }
      const tooLarge = pdfFilesArray.find((f) => f.size > 20 * 1024 * 1024);
      if (tooLarge) {
        setError(`Le PDF « ${tooLarge.name} » dépasse 20MB`);
        return;
      }
      setPdfFiles(pdfFilesArray);
      setError(null);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!singleType || !selectedSingleCategory) {
      setError("Veuillez choisir un type et une catégorie");
      return;
    }

    if (hasSingleSousCategories && !singleSousCategoryId) {
      setError("Veuillez sélectionner une sous-catégorie");
      return;
    }

    for (const field of singleEditableFields) {
      if (field.required && !(fieldValues[field.label] || "").trim()) {
        setError(`Le champ « ${field.label} » est obligatoire`);
        return;
      }
    }

    const totalBytes =
      singleImages.reduce((sum, f) => sum + f.size, 0) + (fichePdf?.size || 0);
    const maxBytes = 45 * 1024 * 1024;
    if (totalBytes > maxBytes) {
      setError(
        "Les fichiers sont trop volumineux (max ~45MB au total). Réduisez la taille des images ou du PDF."
      );
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE_URL = getApiUrl();
      const unique_data: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(fieldValues)) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const def = singleEditableFields.find((f) => f.label === key);
        if (def?.inputType === "number") {
          const num = Number(trimmed.replace(",", "."));
          unique_data[key] = Number.isFinite(num) ? num : trimmed;
        } else {
          unique_data[key] = trimmed;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append("id_catgory", singleCategoryId);
      if (singleSousCategoryId) {
        formDataToSend.append("id_sous_catgory", singleSousCategoryId);
      }
      formDataToSend.append("unique_data", JSON.stringify(unique_data));

      singleImages.forEach((image) => {
        formDataToSend.append("images", image);
      });

      if (fichePdf) {
        formDataToSend.append("ficheTechnique", fichePdf);
      }

      const endpoint = `${API_BASE_URL}${createEndpointForType(singleType)}`;
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: formDataToSend,
      });

      let result: { success?: boolean; message?: string; errors?: string[] } = {};
      try {
        result = await response.json();
      } catch {
        setError(
          response.ok
            ? "Réponse invalide du serveur"
            : "Échec de la création (fichier trop volumineux ou serveur indisponible). Réessayez avec des images plus légères."
        );
        return;
      }

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setError(result.errors.join(". "));
        } else {
          setError(result.message || "Erreur lors de la création");
        }
        return;
      }

      if (result.success) {
        const label =
          singleType === "machine"
            ? "Machine créée"
            : singleType === "service"
              ? "Service créé"
              : "Produit créé";
        setSuccess(`${label} avec succès !`);
        resetSingleForm();
        setSingleType(null);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } catch (err) {
      setError(
        "Impossible de contacter le serveur. Vérifiez votre connexion, ou réduisez la taille des images/PDF."
      );
      console.error("Create catalog item error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!excelImportType) {
      return;
    }

    if (!selectedExcelCategory) {
      setError("Veuillez choisir une catégorie avant de télécharger le modèle");
      return;
    }

    try {
      const API_BASE_URL = getApiUrl();
      const params = new URLSearchParams({
        category: selectedExcelCategory.name_catgory,
      });
      if (selectedExcelSousCategory) {
        params.set("sousCategory", selectedExcelSousCategory.name_sou_catgory);
      }

      const endpoint =
        excelImportType === "machine"
          ? `${API_BASE_URL}/machines/download-template?${params.toString()}`
          : excelImportType === "service"
            ? `${API_BASE_URL}/services/download-template?${params.toString()}`
            : `${API_BASE_URL}/products/download-template?${params.toString()}`;
      const filename =
        excelImportType === "machine"
          ? "modele_automates_biologie_medicale.xlsx"
          : excelImportType === "service"
            ? "modele_services_divers.xlsx"
            : "modele_produits.xlsx";

      const response = await apiFetch(endpoint, { method: "GET" });

      if (!response.ok) {
        setError("Erreur lors du téléchargement du modèle");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
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

    if (!excelImportType) {
      setError("Veuillez choisir un type d'import");
      return;
    }

    if (!excelFile) {
      setError("Veuillez sélectionner un fichier Excel");
      return;
    }

    if (!excelCategoryId) {
      setError("Veuillez sélectionner une catégorie (les colonnes catégorie de l'Excel sont ignorées)");
      return;
    }

    if (hasExcelSousCategories && !excelSousCategoryId) {
      setError("Veuillez sélectionner une sous-catégorie");
      return;
    }

    setIsLoading(true);
    setUploadProgress(30);

    try {
      const API_BASE_URL = getApiUrl();
      const endpoint =
        excelImportType === "machine"
          ? `${API_BASE_URL}/machines/upload-excel`
          : excelImportType === "service"
            ? `${API_BASE_URL}/services/upload-excel`
            : `${API_BASE_URL}/products/upload-excel`;
      const itemLabel =
        excelImportType === "machine"
          ? "machine(s)"
          : excelImportType === "service"
            ? "service(s)"
            : "produit(s)";

      const formDataUpload = new FormData();
      formDataUpload.append("excelFile", excelFile);
      formDataUpload.append("id_catgory", excelCategoryId);
      if (excelSousCategoryId) {
        formDataUpload.append("id_sous_catgory", excelSousCategoryId);
      }

      imageFiles.forEach((imageFile) => {
        formDataUpload.append("images", imageFile);
      });

      pdfFiles.forEach((pdfFile) => {
        formDataUpload.append("ficheTechniques", pdfFile);
      });

      setUploadProgress(60);

      const response = await apiFetch(endpoint, {
        method: "POST",
        body: formDataUpload,
      });

      const result = await response.json();
      setUploadProgress(100);

      if (!response.ok) {
        if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
          setUploadErrors(result.errors);
          setError(result.message || "Erreur lors de l'upload du fichier");
        } else if (result.errorDetails && Array.isArray(result.errorDetails)) {
          setUploadErrors(result.errorDetails);
          setError(result.message || "Erreur lors de l'upload du fichier");
        } else {
          let errorMessage = result.message || "Erreur lors de l'upload du fichier";
          if (result.foundColumns) {
            errorMessage += `\n\nColonnes trouvées: ${result.foundColumns.join(", ")}`;
          }
          setError(errorMessage);
          setUploadErrors([]);
        }
        return;
      }

      if (result.success) {
        setSuccess(
          `Importation réussie ! ${result.data.imported} ${itemLabel} importé(s) sur ${result.data.total}`
        );
        setExcelFile(null);
        setImageFiles([]);
        setPdfFiles([]);
        const fileInput = document.getElementById("excelFile") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        const imagesInput = document.getElementById("productImages") as HTMLInputElement;
        if (imagesInput) imagesInput.value = "";
        const pdfsInput = document.getElementById("excelFichePdfs") as HTMLInputElement;
        if (pdfsInput) pdfsInput.value = "";

        if (result.errorDetails && result.errorDetails.length > 0) {
          setUploadErrors(result.errorDetails);
        } else {
          setUploadErrors([]);
        }
      } else {
        setError(result.message || "Erreur lors de l'upload du fichier");
        setUploadErrors(result.errors || result.errorDetails || []);
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
              setSingleType(null);
              resetSingleForm();
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
              setExcelImportType(null);
              resetExcelImportState();
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
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ajout un par un</h2>
                <p className="text-sm text-gray-600">
                  {singleType
                    ? singleType === "machine"
                      ? "Machine — champs de la catégorie"
                      : singleType === "service"
                        ? "Service — champs de la catégorie"
                        : "Produit — champs de la catégorie"
                    : "Choisissez le type : Produit, Machine ou Service"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {!singleType && (
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    resetSingleForm();
                    setSingleType("product");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Produit</h3>
                  <p className="text-sm text-gray-600">Réactifs, consommables, etc.</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetSingleForm();
                    setSingleType("machine");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Machine</h3>
                  <p className="text-sm text-gray-600">Automates de biologie médicale</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetSingleForm();
                    setSingleType("service");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="p-6 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Services</h3>
                  <p className="text-sm text-gray-600">Services divers</p>
                </button>
              </div>
            )}

            {singleType && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={handleSingleBack}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {showSingleFields && hasSingleSousCategories
                    ? "Retour aux sous-catégories"
                    : singleCategoryId
                      ? "Retour aux catégories"
                      : "Retour aux options"}
                </button>

                {!singleCategoryId && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Catégories{" "}
                      {singleType === "machine"
                        ? "Machine"
                        : singleType === "service"
                          ? "Services"
                          : "Produit"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choisissez une catégorie (type{" "}
                      <span className="font-semibold">{singleCategoryKind}</span>)
                    </p>
                    {isLoadingCategories ? (
                      <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement des catégories...
                      </div>
                    ) : singleFilteredCategories.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Aucune catégorie de type {singleCategoryKind} pour le moment.
                        </p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {singleFilteredCategories.map((cat) => {
                          const imageUrl = getMediaUrl(cat.image);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handlePickSingleCategory(cat.id)}
                              className="text-left rounded-2xl border-2 border-gray-200 overflow-hidden transition-all hover:border-green-400 hover:shadow-md"
                            >
                              <div className="h-28 bg-gray-100">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={cat.name_catgory}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="font-semibold text-gray-900 truncate">
                                  {cat.name_catgory}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.des}</p>
                                <p className="text-xs text-green-600 mt-2">
                                  {cat.sousCategories?.length || 0} sous-catégorie(s)
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedSingleCategory && hasSingleSousCategories && !singleSousCategoryId && (
                  <div>
                    <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
                      Catégorie : <strong>{selectedSingleCategory.name_catgory}</strong>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Sous-catégories</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choisissez une sous-catégorie pour continuer
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {singleSousCategories.map((sc) => {
                        const imageUrl = getMediaUrl(sc.image);
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => handlePickSingleSousCategory(sc.id)}
                            className="text-left rounded-2xl border-2 border-gray-200 overflow-hidden transition-all hover:border-emerald-400 hover:shadow-md"
                          >
                            <div className="h-24 bg-gray-100">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={sc.name_sou_catgory}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Layers className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="font-semibold text-gray-900 truncate">
                                {sc.name_sou_catgory}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showSingleFields && selectedSingleCategory && (
                  <form onSubmit={handleSingleSubmit} className="space-y-6">
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 space-y-1">
                      <p>
                        Type :{" "}
                        <strong>
                          {singleType === "machine"
                            ? "Machine"
                            : singleType === "service"
                              ? "Service"
                              : "Produit"}
                        </strong>
                      </p>
                      <p>
                        Catégorie : <strong>{selectedSingleCategory.name_catgory}</strong>
                      </p>
                      {selectedSingleSousCategory && (
                        <p>
                          Sous-catégorie :{" "}
                          <strong>{selectedSingleSousCategory.name_sou_catgory}</strong>
                        </p>
                      )}
                      {!hasSingleSousCategories && (
                        <p className="text-xs text-green-700">
                          Aucune sous-catégorie — le champ « Sous catégorie » restera vide.
                        </p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      {singleEditableFields.map((field) => (
                        <div
                          key={field.label}
                          className={
                            field.label === "Désignation" || field.label === "Assistance technique"
                              ? "md:col-span-2"
                              : ""
                          }
                        >
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span>{field.label}</span>
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <p className="text-xs text-gray-500 mb-2">{field.desc}</p>
                          <input
                            type={field.inputType === "number" ? "number" : "text"}
                            step={field.inputType === "number" ? "any" : undefined}
                            required={!!field.required}
                            value={fieldValues[field.label] || ""}
                            onChange={(e) => handleFieldChange(field.label, e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                            placeholder={field.desc}
                          />
                        </div>
                      ))}
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <ImageIcon className="w-4 h-4 text-green-600" />
                        <span>Images</span>
                        <span className="text-xs text-gray-500">(jusqu&apos;à 10)</span>
                      </label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors group">
                        <ImageIcon className="w-8 h-8 mb-2 text-gray-400 group-hover:text-green-600" />
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Cliquez pour ajouter</span> des images
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleSingleImageChange}
                          className="hidden"
                        />
                      </label>
                      {singleImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                          {singleImages.map((image, index) => (
                            <div key={`${image.name}-${index}`} className="relative group">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-28 object-cover rounded-xl border-2 border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => removeSingleImage(index)}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {showFicheUpload && (
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span>Fiche Technique (PDF)</span>
                        </label>
                        {fichePdf ? (
                          <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{fichePdf.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(fichePdf.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFichePdf(null)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 font-semibold">
                              Téléverser le PDF de la fiche technique
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PDF uniquement — max 20MB</p>
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              onChange={handleFichePdfChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Création en cours...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-6 h-6" />
                            <span>
                              Créer{" "}
                              {singleType === "machine"
                                ? "la machine"
                                : singleType === "service"
                                  ? "le service"
                                  : "le produit"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Excel Upload Form */}
      {activeTab === "excel" && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 px-6 sm:px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Importation Excel</h2>
                <p className="text-sm text-gray-600">
                  {excelImportType
                    ? excelImportType === "machine"
                      ? "Import Automates de biologie médicale"
                      : excelImportType === "service"
                        ? "Import Services divers"
                        : "Import Produits"
                    : "Choisissez le type d'import"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {!excelImportType && (
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    resetExcelImportState();
                    setExcelImportType("machine");
                  }}
                  className="p-6 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Machine</h3>
                  <p className="text-sm text-gray-600">
                    Automates de biologie médicale
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetExcelImportState();
                    setExcelImportType("service");
                  }}
                  className="p-6 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:border-emerald-500 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Services</h3>
                  <p className="text-sm text-gray-600">Services divers</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetExcelImportState();
                    setExcelImportType("product");
                  }}
                  className="p-6 rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50 hover:border-gray-400 hover:shadow-lg transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Produit</h3>
                  <p className="text-sm text-gray-600">Réactifs, consommables, etc.</p>
                </button>
              </div>
            )}

            {excelImportType && (
              <div className="space-y-6">
                <button
                  type="button"
                  onClick={handleExcelBack}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {showExcelUploadSection && hasExcelSousCategories
                    ? "Retour aux sous-catégories"
                    : excelCategoryId
                      ? "Retour aux catégories"
                      : "Retour aux options"}
                </button>

                {/* Step 1: pick category */}
                {!excelCategoryId && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {excelImportType === "machine"
                        ? "Catégories Machine"
                        : excelImportType === "service"
                          ? "Catégories Services"
                          : "Catégories Produit"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choisissez une catégorie (
                      <span className="font-semibold">
                        type {excelCategoryType}
                      </span>
                      )
                    </p>
                    {isLoadingCategories ? (
                      <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement des catégories...
                      </div>
                    ) : excelFilteredCategories.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Aucune catégorie de type {excelCategoryType} pour le moment.
                        </p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {excelFilteredCategories.map((cat) => {
                          const imageUrl = getMediaUrl(cat.image);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handlePickExcelCategory(cat.id)}
                              className="text-left rounded-2xl border-2 border-gray-200 overflow-hidden transition-all hover:border-blue-400 hover:shadow-md"
                            >
                              <div className="h-28 bg-gray-100">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={cat.name_catgory} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-8 h-8 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              <div className="p-3">
                                <p className="font-semibold text-gray-900 truncate">{cat.name_catgory}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.des}</p>
                                <p className="text-xs text-blue-600 mt-2">
                                  {cat.sousCategories?.length || 0} sous-catégorie(s)
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: pick sous-category if any */}
                {selectedExcelCategory && hasExcelSousCategories && !excelSousCategoryId && (
                  <div>
                    <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      Catégorie : <strong>{selectedExcelCategory.name_catgory}</strong>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Sous-catégories</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choisissez une sous-catégorie pour continuer
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {excelSousCategories.map((sc) => {
                        const imageUrl = getMediaUrl(sc.image);
                        return (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => handlePickExcelSousCategory(sc.id)}
                            className="text-left rounded-2xl border-2 border-gray-200 overflow-hidden transition-all hover:border-emerald-400 hover:shadow-md"
                          >
                            <div className="h-24 bg-gray-100">
                              {imageUrl ? (
                                <img src={imageUrl} alt={sc.name_sou_catgory} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Layers className="w-8 h-8 text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="font-semibold text-gray-900 truncate">{sc.name_sou_catgory}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step 3: XLS download + columns + upload */}
                {showExcelUploadSection && selectedExcelCategory && (
                  <>
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800 space-y-1">
                      <p>
                        Catégorie : <strong>{selectedExcelCategory.name_catgory}</strong>
                      </p>
                      {selectedExcelSousCategory && (
                        <p>
                          Sous-catégorie : <strong>{selectedExcelSousCategory.name_sou_catgory}</strong>
                        </p>
                      )}
                      {!hasExcelSousCategories && (
                        <p className="text-green-700 text-xs">
                          Aucune sous-catégorie — la colonne « Sous catégorie » restera vide dans le XLS.
                        </p>
                      )}
                      {hasExcelSousCategories && selectedExcelSousCategory && (
                        <p className="text-green-700 text-xs">
                          Catégorie et sous-catégorie seront remplies automatiquement à l&apos;import.
                        </p>
                      )}
                    </div>

                    <div className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-200 rounded-2xl shadow-sm">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                              <h3 className="font-bold text-blue-900 mb-2 text-lg">
                                Modèle Excel — {selectedExcelCategory.name_catgory}
                              </h3>
                              <p className="text-sm text-blue-700">
                                Votre fichier Excel doit contenir les colonnes suivantes :
                              </p>
                            </div>
                            {excelImportType && (
                              <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
                              >
                                <FileText className="w-4 h-4" />
                                Télécharger le modèle
                              </button>
                            )}
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {excelColumnsForType.map((col, idx) => (
                              <div
                                key={col.label}
                                className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-blue-100"
                              >
                                <div className="w-6 h-6 bg-blue-600 text-white rounded text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-semibold text-blue-900">{col.label}</span>
                                  <p className="text-xs text-blue-700">{col.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {excelImportType && (
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
                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-cyan-50 hover:border-blue-400 transition-all group">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all shadow-lg">
                                  <Upload className="w-10 h-10 text-blue-600" />
                                </div>
                                <p className="mb-2 text-sm font-semibold text-gray-700">Cliquez pour télécharger</p>
                                <p className="text-xs text-gray-500 mb-1">ou glissez-déposez votre fichier ici</p>
                                <p className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
                                  Excel (.xlsx, .xls) — MAX. 10MB
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

                        <div>
                          <label htmlFor="productImages" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                            <ImageIcon className="w-4 h-4 text-blue-600" />
                            <span>Images (optionnel)</span>
                          </label>
                          <p className="text-xs text-gray-500 mb-3">
                            Images correspondant à la colonne &quot;Image&quot; du fichier Excel
                            (ex: <code className="bg-gray-100 px-1 rounded">photo1.jpg</code>)
                          </p>
                          {imageFiles.length > 0 ? (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-2xl">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-gray-900">
                                  {imageFiles.length} image(s)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImageFiles([]);
                                    const imagesInput = document.getElementById("productImages") as HTMLInputElement;
                                    if (imagesInput) imagesInput.value = "";
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:border-blue-400 transition-all">
                              <ImageIcon className="w-8 h-8 text-blue-600 mb-2" />
                              <p className="text-sm font-semibold text-gray-700">Sélectionner les images</p>
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

                        {excelImportType && typeHasFicheTechnique(excelImportType) && (
                          <div>
                            <label
                              htmlFor="excelFichePdfs"
                              className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"
                            >
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <span>Fiches techniques PDF (optionnel)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                              Si la colonne &quot;Fiche Technique&quot; de l&apos;Excel contient un nom de fichier
                              (ex: <code className="bg-gray-100 px-1 rounded">fiche_produit1.pdf</code>),
                              uploadez ici les PDF correspondants — un PDF par ligne / produit.
                            </p>
                            {pdfFiles.length > 0 ? (
                              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {pdfFiles.length} PDF(s)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPdfFiles([]);
                                      const pdfsInput = document.getElementById(
                                        "excelFichePdfs"
                                      ) as HTMLInputElement;
                                      if (pdfsInput) pdfsInput.value = "";
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <ul className="space-y-2 max-h-40 overflow-y-auto">
                                  {pdfFiles.map((file, idx) => (
                                    <li
                                      key={`${file.name}-${idx}`}
                                      className="flex items-center gap-2 text-sm text-gray-800 bg-white/70 rounded-lg px-3 py-2 border border-emerald-100"
                                    >
                                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="truncate font-medium">{file.name}</span>
                                      <span className="text-xs text-gray-500 shrink-0 ml-auto">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:border-emerald-400 transition-all">
                                <FileText className="w-8 h-8 text-emerald-600 mb-2" />
                                <p className="text-sm font-semibold text-gray-700">
                                  Sélectionner les PDF
                                </p>
                                <p className="text-xs text-gray-500 mt-1">PDF — MAX. 20MB chacun</p>
                                <input
                                  type="file"
                                  id="excelFichePdfs"
                                  name="excelFichePdfs"
                                  accept="application/pdf,.pdf"
                                  multiple
                                  onChange={handlePdfsChange}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        )}

                        {uploadErrors.length > 0 && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-sm font-semibold text-amber-900 mb-2">
                              Avertissements ({uploadErrors.length})
                            </p>
                            <ul className="text-xs text-amber-800 space-y-1 max-h-40 overflow-y-auto">
                              {uploadErrors.map((errMsg, idx) => (
                                <li key={idx}>• {errMsg}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {isLoading && (
                          <div className="space-y-3 p-5 bg-blue-50 rounded-2xl border-2 border-blue-200">
                            <div className="flex items-center justify-between text-sm font-semibold text-blue-900">
                              <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Importation en cours...
                              </span>
                              <span className="font-bold">{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4 pt-6 border-t border-gray-200">
                          <button
                            type="submit"
                            disabled={isLoading || !excelFile}
                            className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Importation en cours...</span>
                              </>
                            ) : (
                              <>
                                <FileSpreadsheet className="w-6 h-6" />
                                <span>
                                  Importer les{" "}
                                  {excelImportType === "machine"
                                    ? "machines"
                                    : excelImportType === "service"
                                      ? "services"
                                      : "produits"}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

