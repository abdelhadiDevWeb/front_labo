"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  Package,
  Calendar,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import {
  getSupplierProducts,
  getSupplierPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  Product,
  Promotion,
} from "@/lib/api";

type PromotionFormState = {
  id_product: string;
  normal_price: string;
  price_discount: string;
  min_quantity: string;
  start_day: string;
  end_day: string;
};

const emptyForm: PromotionFormState = {
  id_product: "",
  price_discount: "",
  normal_price: "",
  min_quantity: "1",
  start_day: "",
  end_day: "",
};

const DECIMAL_INPUT = /^\d*([.,]\d*)?$/;
const INTEGER_INPUT = /^\d*$/;

function normalizeDecimalInput(value: string) {
  return value.replace(",", ".");
}

function parseFormNumbers(form: PromotionFormState) {
  return {
    normal_price: parseFloat(normalizeDecimalInput(form.normal_price)),
    price_discount: parseFloat(normalizeDecimalInput(form.price_discount)),
    min_quantity: parseInt(form.min_quantity, 10),
  };
}

function toDateInputValue(value: string | Date) {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function getPromotionStatus(promotion: Promotion) {
  const now = new Date();
  const start = new Date(promotion.start_day);
  const end = new Date(promotion.end_day);
  end.setHours(23, 59, 59, 999);

  if (now < start) return { label: "À venir", className: "bg-blue-100 text-blue-800" };
  if (now > end) return { label: "Expirée", className: "bg-gray-100 text-gray-700" };
  return { label: "Active", className: "bg-green-100 text-green-800" };
}

export default function PromotionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [createForm, setCreateForm] = useState<PromotionFormState>(emptyForm);
  const [updateForm, setUpdateForm] = useState<PromotionFormState>(emptyForm);

  useEffect(() => {
    setMounted(true);
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsResult, promotionsResult] = await Promise.all([
        getSupplierProducts(),
        getSupplierPromotions(),
      ]);
      if (productsResult.success && productsResult.data) {
        setProducts(productsResult.data.products || []);
      }
      if (promotionsResult.success && promotionsResult.data) {
        setPromotions(promotionsResult.data.promotions);
      } else if (!promotionsResult.success) {
        setError(promotionsResult.message || "Erreur lors du chargement des promotions");
      }
    } catch {
      setError("Une erreur est survenue lors du chargement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (productId: string, isUpdate = false) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (isUpdate) {
      setUpdateForm((prev) => ({
        ...prev,
        id_product: productId,
        normal_price: String(prev.normal_price || product.sellingPrice),
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        id_product: productId,
        normal_price: String(product.sellingPrice),
        price_discount: String(Math.round(product.sellingPrice * 0.9 * 100) / 100),
      }));
    }
  };

  const filteredPromotions = promotions.filter((promotion) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      promotion.product?.name.toLowerCase().includes(q) ||
      promotion.id.toLowerCase().includes(q) ||
      promotion.normal_price.toString().includes(q) ||
      promotion.price_discount.toString().includes(q)
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const parsed = parseFormNumbers(createForm);
      if (
        !createForm.id_product ||
        !createForm.start_day ||
        !createForm.end_day ||
        Number.isNaN(parsed.normal_price) ||
        Number.isNaN(parsed.price_discount) ||
        Number.isNaN(parsed.min_quantity)
      ) {
        setError("Veuillez remplir tous les champs correctement");
        setIsSubmitting(false);
        return;
      }

      const result = await createPromotion({
        id_product: createForm.id_product,
        start_day: createForm.start_day,
        end_day: createForm.end_day,
        normal_price: parsed.normal_price,
        price_discount: parsed.price_discount,
        min_quantity: parsed.min_quantity,
      });

      if (result.success) {
        setSuccess("Promotion créée avec succès");
        setShowCreateModal(false);
        setCreateForm(emptyForm);
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la création");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdate = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setUpdateForm({
      id_product: promotion.id_product,
      price_discount: String(promotion.price_discount),
      normal_price: String(promotion.normal_price),
      min_quantity: String(promotion.min_quantity),
      start_day: toDateInputValue(promotion.start_day),
      end_day: toDateInputValue(promotion.end_day),
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPromotion) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const parsed = parseFormNumbers(updateForm);
      if (
        !updateForm.id_product ||
        !updateForm.start_day ||
        !updateForm.end_day ||
        Number.isNaN(parsed.normal_price) ||
        Number.isNaN(parsed.price_discount) ||
        Number.isNaN(parsed.min_quantity)
      ) {
        setError("Veuillez remplir tous les champs correctement");
        setIsSubmitting(false);
        return;
      }

      const result = await updatePromotion(selectedPromotion.id, {
        id_product: updateForm.id_product,
        start_day: updateForm.start_day,
        end_day: updateForm.end_day,
        normal_price: parsed.normal_price,
        price_discount: parsed.price_discount,
        min_quantity: parsed.min_quantity,
      });

      if (result.success) {
        setSuccess("Promotion mise à jour avec succès");
        setShowUpdateModal(false);
        setSelectedPromotion(null);
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la mise à jour");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (promotionId: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;

    setDeletingId(promotionId);
    setError(null);
    setSuccess(null);

    try {
      const result = await deletePromotion(promotionId);
      if (result.success) {
        setSuccess("Promotion supprimée avec succès");
        await loadData();
      } else {
        setError(result.message || "Erreur lors de la suppression");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setDeletingId(null);
    }
  };

  const discountPercent = (normal: number, discount: number) => {
    if (normal <= 0) return 0;
    return Math.round(((normal - discount) / normal) * 100);
  };

  const PromotionFormFields = ({
    form,
    setForm,
    isUpdate,
  }: {
    form: PromotionFormState;
    setForm: React.Dispatch<React.SetStateAction<PromotionFormState>>;
    isUpdate?: boolean;
  }) => {
    const normalNum = parseFloat(normalizeDecimalInput(form.normal_price));
    const discountNum = parseFloat(normalizeDecimalInput(form.price_discount));

    return (
    <>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Produit <span className="text-red-500">*</span>
        </label>
        <select
          required
          value={form.id_product || ""}
          onChange={(e) => handleProductSelect(e.target.value, isUpdate)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
        >
          <option value="">Sélectionner un produit</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} — {product.sellingPrice.toFixed(2)} DA
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix normal / unité (DA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="0"
            value={form.normal_price}
            onChange={(e) => {
              const value = e.target.value;
              if (DECIMAL_INPUT.test(value)) {
                setForm({ ...form, normal_price: value });
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Prix promo / unité (DA) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="0"
            value={form.price_discount}
            onChange={(e) => {
              const value = e.target.value;
              if (DECIMAL_INPUT.test(value)) {
                setForm({ ...form, price_discount: value });
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
          {!Number.isNaN(normalNum) && !Number.isNaN(discountNum) && normalNum > 0 && form.price_discount !== "" && (
            <p className="text-xs text-green-700 mt-1">
              Réduction: {discountPercent(normalNum, discountNum)}%
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Quantité minimum à acheter <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          required
          placeholder="1"
          value={form.min_quantity}
          onChange={(e) => {
            const value = e.target.value;
            if (INTEGER_INPUT.test(value)) {
              setForm({ ...form, min_quantity: value });
            }
          }}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Le client doit acheter au moins cette quantité pour bénéficier du prix promotionnel.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date de début <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.start_day || ""}
            onChange={(e) => setForm({ ...form, start_day: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date de fin <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.end_day || ""}
            onChange={(e) => setForm({ ...form, end_day: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
      </div>
    </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-8 h-8 text-green-600" />
            Promotions
          </h1>
          <p className="text-gray-600 mt-1">Créez des remises sur vos produits par quantité et période</p>
        </div>
        <button
          onClick={() => {
            setCreateForm(emptyForm);
            setShowCreateModal(true);
          }}
          disabled={products.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Nouvelle promotion
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-800">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une promotion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        {filteredPromotions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="py-3 px-3 font-semibold">Produit</th>
                  <th className="py-3 px-3 font-semibold">Prix normal</th>
                  <th className="py-3 px-3 font-semibold">Prix promo</th>
                  <th className="py-3 px-3 font-semibold">Qté min.</th>
                  <th className="py-3 px-3 font-semibold">Période</th>
                  <th className="py-3 px-3 font-semibold">Statut</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions.map((promotion) => {
                  const status = getPromotionStatus(promotion);
                  return (
                    <tr key={promotion.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">
                        {promotion.product?.name || promotion.id_product}
                      </td>
                      <td className="py-3 px-3">{promotion.normal_price.toLocaleString("fr-FR")} DA</td>
                      <td className="py-3 px-3 text-green-700 font-semibold">
                        {promotion.price_discount.toLocaleString("fr-FR")} DA
                        <span className="text-xs text-gray-500 ml-1">
                          (-{discountPercent(promotion.normal_price, promotion.price_discount)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                          {promotion.min_quantity}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {toDateInputValue(promotion.start_day)} → {toDateInputValue(promotion.end_day)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenUpdate(promotion)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(promotion.id)}
                            disabled={deletingId === promotion.id}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {deletingId === promotion.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery ? "Aucune promotion trouvée" : "Aucune promotion pour le moment"}
            </p>
          </div>
        )}
      </div>

      {mounted && showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Nouvelle promotion
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <PromotionFormFields form={createForm} setForm={setCreateForm} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-3 border rounded-xl">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {mounted && showUpdateModal && selectedPromotion && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit className="w-6 h-6" />
                Modifier la promotion
              </h3>
              <button onClick={() => setShowUpdateModal(false)} className="text-white/80 hover:text-white p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <PromotionFormFields form={updateForm} setForm={setUpdateForm} isUpdate />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 px-4 py-3 border rounded-xl">
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
