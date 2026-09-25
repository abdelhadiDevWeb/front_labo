"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Tag,
  Building2,
  FileText,
} from "lucide-react";
import {
  UniqueDataItem,
  getSupplierMachines,
  getSupplierServices,
  updateMachine,
  updateService,
  deleteMachine,
  deleteService,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";
import { getFicheTechniquePdfUrl } from "@/lib/fiche-technique-url";
import {
  editableFieldsForType,
  isFicheTechniqueField,
  typeHasFicheTechnique,
} from "@/lib/catalog-form-fields";

type CatalogKind = "machine" | "service";

const TITLE_KEYS = ["Désignation", "designation", "name", "nom", "Nom"];
const HIDDEN_KEYS = new Set([
  "images",
  "video",
  "latitude",
  "longitude",
  "wilaya",
  "daira",
  "commune",
  "Wilaya",
  "Daira",
  "Commune",
]);

const pickStr = (data: Record<string, unknown>, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  const lower = new Map(
    Object.entries(data).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const key of keys) {
    const value = lower.get(key.toLowerCase().trim());
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
};

const getImages = (data: Record<string, unknown>): string[] => {
  const raw = data.images;
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.trim() !== "");
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
};

export default function CatalogItemDetailPage({ kind }: { kind: CatalogKind }) {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<UniqueDataItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newFiche, setNewFiche] = useState<File | null>(null);

  const labels = useMemo(
    () => ({
      singular: kind === "machine" ? "Machine" : "Service",
      listPath: "/dashboard-supplier/products",
      notFound: kind === "machine" ? "Machine introuvable" : "Service introuvable",
      deleted: kind === "machine" ? "cette machine" : "ce service",
      updated:
        kind === "machine"
          ? "Machine mise à jour avec succès"
          : "Service mis à jour avec succès",
    }),
    [kind]
  );

  const editableFields = useMemo(() => editableFieldsForType(kind), [kind]);

  const buildFieldValues = (data: Record<string, unknown>) => {
    const next: Record<string, string> = {};
    for (const field of editableFields) {
      const value = data[field.label];
      next[field.label] =
        value === undefined || value === null ? "" : String(value);
    }
    return next;
  };

  const loadItem = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (kind === "machine") {
        const result = await getSupplierMachines();
        if (!result.success || !result.data) {
          setError(result.message || "Erreur lors du chargement");
          setItem(null);
          return;
        }
        const found = result.data.machines.find((m) => String(m.id) === itemId);
        if (!found) {
          setError(labels.notFound);
          setItem(null);
          return;
        }
        setItem(found);
        setFieldValues(buildFieldValues(found.unique_data || {}));
      } else {
        const result = await getSupplierServices();
        if (!result.success || !result.data) {
          setError(result.message || "Erreur lors du chargement");
          setItem(null);
          return;
        }
        const found = result.data.services.find((s) => String(s.id) === itemId);
        if (!found) {
          setError(labels.notFound);
          setItem(null);
          return;
        }
        setItem(found);
        setFieldValues(buildFieldValues(found.unique_data || {}));
      }
    } catch (err) {
      console.error("Load catalog item error:", err);
      setError("Une erreur est survenue");
      setItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, kind]);

  const uniqueData = item?.unique_data || {};
  const title =
    pickStr(uniqueData, TITLE_KEYS) ||
    (kind === "machine" ? "Machine" : "Service");
  const brand = pickStr(uniqueData, ["Marque", "brand", "marque"]);
  const category = pickStr(uniqueData, ["Catégorie", "category", "categorie"]);
  const sousCategory = pickStr(uniqueData, [
    "Sous catégorie",
    "sous categorie",
    "sousCategory",
  ]);
  const images = getImages(uniqueData);
  const fichePdfUrl = getFicheTechniquePdfUrl(uniqueData);

  const displayEntries = Object.entries(uniqueData).filter(([key, value]) => {
    if (HIDDEN_KEYS.has(key)) return false;
    if (isFicheTechniqueField(key)) return false;
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) || typeof value === "object") return false;
    return true;
  });

  const handleUpdate = async () => {
    if (!item) return;
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    const unique_data: Record<string, string | number> = {};
    for (const field of editableFields) {
      const raw = (fieldValues[field.label] || "").trim();
      if (!raw) continue;
      if (field.inputType === "number") {
        const num = Number(raw.replace(",", "."));
        unique_data[field.label] = Number.isFinite(num) ? num : raw;
      } else {
        unique_data[field.label] = raw;
      }
    }

    try {
      const payload = {
        unique_data,
        images: newImages.length > 0 ? newImages : undefined,
        ficheTechnique: newFiche || undefined,
      };
      const result =
        kind === "machine"
          ? await updateMachine(String(item.id), payload)
          : await updateService(String(item.id), payload);

      if (result.success) {
        setUpdateSuccess(labels.updated);
        setIsEditing(false);
        setNewImages([]);
        setNewFiche(null);
        await loadItem();
        setTimeout(() => setUpdateSuccess(null), 3000);
      } else {
        setUpdateError(result.message || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error("Update catalog item error:", err);
      setUpdateError("Une erreur est survenue");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer ${labels.deleted} ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const result =
        kind === "machine"
          ? await deleteMachine(String(item.id))
          : await deleteService(String(item.id));
      if (result.success) {
        router.push(labels.listPath);
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error("Delete catalog item error:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push(labels.listPath)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-600">{error || labels.notFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => router.push(labels.listPath)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span>Retour au marché</span>
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {images.length > 0 ? (
              <div className="relative">
                <img
                  src={getMediaUrl(images[selectedImageIndex]) || ""}
                  alt={title}
                  className="w-full h-96 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="20" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                  }}
                />
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === selectedImageIndex ? "bg-white w-8" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative h-24 rounded-xl overflow-hidden border-2 transition-all ${
                    index === selectedImageIndex
                      ? "border-green-600 ring-2 ring-green-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={getMediaUrl(image) || ""}
                    alt={`${title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {fichePdfUrl && (
            <a
              href={fichePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-green-400 transition-colors"
            >
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Voir la fiche technique</span>
            </a>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  kind === "machine"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {labels.singular}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {brand && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{brand}</span>
                </div>
              )}
              {category && (
                <>
                  {brand && <span>•</span>}
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">{category}</span>
                  </div>
                </>
              )}
              {sousCategory && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">{sousCategory}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Détails</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs text-gray-500 mb-1">{key}</p>
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {isEditing ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 space-y-6">
              <h3 className="text-xl font-bold text-gray-900">
                Modifier {labels.singular.toLowerCase()}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    value={category || "Non définie"}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    La catégorie ne peut pas être modifiée
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sous-catégorie
                  </label>
                  <input
                    type="text"
                    value={sousCategory || "Non définie"}
                    readOnly
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    La sous-catégorie ne peut pas être modifiée
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editableFields.map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>
                    <input
                      type={field.inputType === "number" ? "number" : "text"}
                      step={field.inputType === "number" ? "any" : undefined}
                      value={fieldValues[field.label] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.label]: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouvelles images (optionnel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    setNewImages(
                      Array.from(files)
                        .filter((f) => f.type.startsWith("image/"))
                        .slice(0, 10)
                    );
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                />
                {newImages.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {newImages.length} image(s) sélectionnée(s)
                  </p>
                )}
              </div>

              {typeHasFicheTechnique(kind) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouvelle fiche technique PDF (optionnel)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setNewFiche(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  {newFiche && (
                    <p className="mt-2 text-sm text-gray-600">{newFiche.name}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
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
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUpdateError(null);
                    setUpdateSuccess(null);
                    setNewImages([]);
                    setNewFiche(null);
                    setFieldValues(buildFieldValues(uniqueData));
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
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2"
              >
                <Edit className="w-5 h-5" />
                <span>Modifier</span>
              </button>
              <button
                type="button"
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
