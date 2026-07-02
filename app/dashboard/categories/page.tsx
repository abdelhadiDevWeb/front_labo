"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  Image as ImageIcon,
  Layers,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSousCategory,
  updateSousCategory,
  deleteSousCategory,
  Category,
  SousCategory,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

type ModalType =
  | "createCategory"
  | "editCategory"
  | "createSousCategory"
  | "editSousCategory"
  | null;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSousCategory, setSelectedSousCategory] = useState<SousCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDes, setCategoryDes] = useState("");
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string | null>(null);

  const [sousCategoryName, setSousCategoryName] = useState("");
  const [sousCategoryImage, setSousCategoryImage] = useState<File | null>(null);
  const [sousCategoryImagePreview, setSousCategoryImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllCategories();
      if (result.success && result.data) {
        setCategories(result.data.categories);
      } else {
        setError(result.message || "Erreur lors du chargement des catégories");
      }
    } catch {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForms = () => {
    setCategoryName("");
    setCategoryDes("");
    setCategoryImage(null);
    setCategoryImagePreview(null);
    setSousCategoryName("");
    setSousCategoryImage(null);
    setSousCategoryImagePreview(null);
    setSelectedCategory(null);
    setSelectedSousCategory(null);
  };

  const closeModal = () => {
    setModalType(null);
    resetForms();
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImageChange = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    setFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const openCreateCategory = () => {
    resetForms();
    setModalType("createCategory");
  };

  const openEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryName(category.name_catgory);
    setCategoryDes(category.des);
    setCategoryImagePreview(getMediaUrl(category.image));
    setModalType("editCategory");
  };

  const openCreateSousCategory = (category: Category) => {
    resetForms();
    setSelectedCategory(category);
    setModalType("createSousCategory");
  };

  const openEditSousCategory = (category: Category, sousCategory: SousCategory) => {
    setSelectedCategory(category);
    setSelectedSousCategory(sousCategory);
    setSousCategoryName(sousCategory.name_sou_catgory);
    setSousCategoryImagePreview(getMediaUrl(sousCategory.image));
    setModalType("editSousCategory");
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryImage) {
      setError("L'image de la catégorie est requise");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createCategory({
        name_catgory: categoryName.trim(),
        des: categoryDes.trim(),
        image: categoryImage,
      });
      if (result.success) {
        setSuccess("Catégorie créée avec succès");
        closeModal();
        await loadCategories();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateCategory(selectedCategory.id, {
        name_catgory: categoryName.trim(),
        des: categoryDes.trim(),
        image: categoryImage || undefined,
      });
      if (result.success) {
        setSuccess("Catégorie mise à jour");
        closeModal();
        await loadCategories();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Supprimer cette catégorie et toutes ses sous-catégories ?")) return;
    setDeletingId(categoryId);
    setError(null);
    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        setSuccess("Catégorie supprimée");
        await loadCategories();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateSousCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !sousCategoryImage) {
      setError("L'image de la sous-catégorie est requise");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createSousCategory(selectedCategory.id, {
        name_sou_catgory: sousCategoryName.trim(),
        image: sousCategoryImage,
      });
      if (result.success) {
        setSuccess("Sous-catégorie créée avec succès");
        closeModal();
        await loadCategories();
        setExpandedIds((prev) => new Set(prev).add(selectedCategory.id));
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSousCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSousCategory) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await updateSousCategory(selectedSousCategory.id, {
        name_sou_catgory: sousCategoryName.trim(),
        image: sousCategoryImage || undefined,
      });
      if (result.success) {
        setSuccess("Sous-catégorie mise à jour");
        closeModal();
        await loadCategories();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSousCategory = async (sousCategoryId: string) => {
    if (!confirm("Supprimer cette sous-catégorie ?")) return;
    setDeletingId(sousCategoryId);
    setError(null);
    try {
      const result = await deleteSousCategory(sousCategoryId);
      if (result.success) {
        setSuccess("Sous-catégorie supprimée");
        await loadCategories();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((cat) => {
    const q = searchQuery.toLowerCase();
    return (
      cat.name_catgory.toLowerCase().includes(q) ||
      cat.des.toLowerCase().includes(q) ||
      cat.sousCategories.some((sc) => sc.name_sou_catgory.toLowerCase().includes(q))
    );
  });

  const renderModal = () => {
    if (!modalType || !mounted) return null;

    const isCategoryModal = modalType === "createCategory" || modalType === "editCategory";
    const isSousModal = modalType === "createSousCategory" || modalType === "editSousCategory";

    const title = {
      createCategory: "Nouvelle catégorie",
      editCategory: "Modifier la catégorie",
      createSousCategory: `Nouvelle sous-catégorie — ${selectedCategory?.name_catgory || ""}`,
      editSousCategory: "Modifier la sous-catégorie",
    }[modalType];

    const onSubmit = {
      createCategory: handleCreateCategory,
      editCategory: handleUpdateCategory,
      createSousCategory: handleCreateSousCategory,
      editSousCategory: handleUpdateSousCategory,
    }[modalType];

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <button onClick={closeModal} className="rounded-lg p-2 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            {isCategoryModal && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom de la catégorie *</label>
                  <input
                    type="text"
                    required
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Réactifs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={categoryDes}
                    onChange={(e) => setCategoryDes(e.target.value)}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Description de la catégorie..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Image {modalType === "createCategory" ? "*" : "(optionnel)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={modalType === "createCategory"}
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] || null,
                        setCategoryImage,
                        setCategoryImagePreview
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  />
                  {categoryImagePreview && (
                    <img
                      src={categoryImagePreview}
                      alt="Preview"
                      className="mt-3 h-32 w-full rounded-xl object-cover border border-gray-200"
                    />
                  )}
                </div>
              </>
            )}

            {isSousModal && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nom de la sous-catégorie *</label>
                  <input
                    type="text"
                    required
                    value={sousCategoryName}
                    onChange={(e) => setSousCategoryName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: PCR"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Image {modalType === "createSousCategory" ? "*" : "(optionnel)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={modalType === "createSousCategory"}
                    onChange={(e) =>
                      handleImageChange(
                        e.target.files?.[0] || null,
                        setSousCategoryImage,
                        setSousCategoryImagePreview
                      )
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  />
                  {sousCategoryImagePreview && (
                    <img
                      src={sousCategoryImagePreview}
                      alt="Preview"
                      className="mt-3 h-32 w-full rounded-xl object-cover border border-gray-200"
                    />
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {modalType.startsWith("create") ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FolderTree className="h-7 w-7 text-blue-600" />
            Gestion des catégories
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez les catégories et sous-catégories du marketplace
          </p>
        </div>
        <button
          onClick={openCreateCategory}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une catégorie ou sous-catégorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <FolderTree className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-600">Aucune catégorie trouvée</p>
          <button onClick={openCreateCategory} className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700">
            Créer la première catégorie
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const isExpanded = expandedIds.has(category.id);
            const imageUrl = getMediaUrl(category.image);

            return (
              <div key={category.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  <div className="h-28 w-full flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-24">
                    {imageUrl ? (
                      <img src={imageUrl} alt={category.name_catgory} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{category.name_catgory}</h2>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{category.des}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {category.sousCategories.length} sous-catégorie
                          {category.sousCategories.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditCategory(category)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => openCreateSousCategory(category)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                          <Plus className="h-4 w-4" />
                          Sous-catégorie
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={deletingId === category.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === category.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-gray-50/80 px-5 py-3">
                  <button
                    onClick={() => toggleExpand(category.id)}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Layers className="h-4 w-4" />
                    {isExpanded ? "Masquer" : "Afficher"} les sous-catégories
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-white p-5">
                    {category.sousCategories.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune sous-catégorie pour le moment.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {category.sousCategories.map((sc) => {
                          const scImageUrl = getMediaUrl(sc.image);
                          return (
                            <div
                              key={sc.id}
                              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                            >
                              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
                                {scImageUrl ? (
                                  <img src={scImageUrl} alt={sc.name_sou_catgory} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">{sc.name_sou_catgory}</p>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={() => openEditSousCategory(category, sc)}
                                    className="rounded-md p-1.5 text-gray-600 hover:bg-white hover:text-blue-600"
                                    title="Modifier"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSousCategory(sc.id)}
                                    disabled={deletingId === sc.id}
                                    className="rounded-md p-1.5 text-gray-600 hover:bg-white hover:text-red-600 disabled:opacity-50"
                                    title="Supprimer"
                                  >
                                    {deletingId === sc.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {renderModal()}
    </div>
  );
}
