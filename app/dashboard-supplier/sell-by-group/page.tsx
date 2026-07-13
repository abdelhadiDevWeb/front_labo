"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Loader2,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import {
  createGroupSelle,
  getSupplierGroupSelles,
  getSupplierProducts,
  GroupSelleItem,
  Product,
} from "@/lib/api";
import { getMediaUrl } from "@/lib/media-url";

export default function SellByGroupPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groupSelles, setGroupSelles] = useState<GroupSelleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [productId, setProductId] = useState("");
  const [qu, setQu] = useState("");
  const [priceByOne, setPriceByOne] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const toDateInputValue = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  /** Parse YYYY-MM-DD as local calendar day (start or end of day). */
  const parseDay = (value: string, endOfDay = false): Date => {
    const [y, m, d] = value.split("-").map(Number);
    if (endOfDay) {
      return new Date(y, m - 1, d, 23, 59, 59, 999);
    }
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  const todayStr = useMemo(() => toDateInputValue(new Date()), []);

  const minEndDate = useMemo(() => {
    if (startDate) return startDate;
    return todayStr;
  }, [startDate, todayStr]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, groupsRes] = await Promise.all([
        getSupplierProducts(),
        getSupplierGroupSelles(),
      ]);

      if (productsRes.success && productsRes.data?.products) {
        setProducts(productsRes.data.products);
      }
      if (groupsRes.success && groupsRes.data?.groupSelles) {
        setGroupSelles(groupsRes.data.groupSelles);
      } else if (!groupsRes.success) {
        setError(groupsRes.message || "Erreur de chargement");
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetForm = () => {
    setProductId("");
    setQu("");
    setPriceByOne("");
    setStartDate("");
    setEndDate("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedProduct) {
      setError("Choisissez un produit");
      return;
    }

    const targetQu = Number(qu);
    const unitPrice = Number(priceByOne);

    if (!Number.isFinite(targetQu) || targetQu < 1) {
      setError("La quantité cible doit être un nombre valide (≥ 1)");
      return;
    }

    if (selectedProduct.quantity < 1) {
      setError("Ce produit n'a pas de stock disponible pour une vente groupée");
      return;
    }

    if (targetQu > selectedProduct.quantity) {
      setError(
        `La quantité cible ne peut pas dépasser le stock du produit (${selectedProduct.quantity})`
      );
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Prix unitaire invalide");
      return;
    }

    if (!startDate) {
      setError("Choisissez une date de début");
      return;
    }

    if (!endDate) {
      setError("Choisissez une date de fin");
      return;
    }

    const start = parseDay(startDate, false);
    const end = parseDay(endDate, true);

    if (Number.isNaN(start.getTime())) {
      setError("La date de début est invalide");
      return;
    }

    if (Number.isNaN(end.getTime())) {
      setError("La date de fin est invalide");
      return;
    }

    if (endDate < startDate) {
      setError("La date de fin doit être après ou égale à la date de début");
      return;
    }

    const today = toDateInputValue(new Date());
    if (endDate < today) {
      setError("La date de fin ne peut pas être dans le passé");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createGroupSelle({
        id_item: selectedProduct.id,
        qu: targetQu,
        price_by_one: unitPrice,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });

      if (!result.success) {
        setError(result.message || "Création impossible");
        return;
      }

      setSuccess("Vente groupée créée avec succès");
      resetForm();
      setShowForm(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 rounded-2xl p-8 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Vente groupée</h1>
              <p className="text-teal-100 text-sm mt-1">
                Créez une annonce de vente groupée sur vos produits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError(null);
              setSuccess(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-teal-700 rounded-xl font-semibold hover:bg-teal-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle annonce
          </button>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Créer une vente groupée</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Produit <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p && !priceByOne) {
                    setPriceByOne(String(p.sellingPrice ?? ""));
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">Sélectionner un produit</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — stock {p.quantity} — {p.sellingPrice?.toFixed?.(2) ?? p.sellingPrice} DA
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="text-xs text-teal-700 mt-2">
                  Stock actuel : <strong>{selectedProduct.quantity}</strong> — la quantité
                  de l&apos;annonce sera <strong>retirée du stock</strong> dès la création.
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantité cible <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedProduct ? selectedProduct.quantity : undefined}
                  required
                  value={qu}
                  onChange={(e) => setQu(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder={
                    selectedProduct
                      ? `1 – ${selectedProduct.quantity}`
                      : "Ex: 100"
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prix unitaire (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={priceByOne}
                  onChange={(e) => setPriceByOne(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Ex: 1200"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de début <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (endDate && e.target.value && endDate < e.target.value) {
                      setEndDate("");
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de fin <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={minEndDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            {selectedProduct && qu && priceByOne && Number(qu) > 0 && Number(priceByOne) >= 0 && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-900">
                Total annoncé :{" "}
                <strong>
                  {(Number(qu) * Number(priceByOne)).toFixed(2)} DA
                </strong>{" "}
                ({qu} × {priceByOne} DA)
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || products.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Créer l&apos;annonce
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Mes ventes groupées</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Chargement...
          </div>
        ) : groupSelles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucune vente groupée pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupSelles.map((g) => {
              const img = g.product?.images?.[0]
                ? getMediaUrl(g.product.images[0])
                : null;
              return (
                <div key={g.id} className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-28 h-28 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">
                        {g.product?.name || "Produit"}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          g.status === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {g.status === "open" ? "Ouverte" : "Fermée"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {g.price_by_one.toFixed(2)} DA / unité · Objectif {g.qu} · Total{" "}
                      {g.total.toFixed(2)} DA
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>
                          Progression {g.committedQuantity}/{g.qu}
                        </span>
                        <span>{g.progressPercent}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${g.progressPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {g.users.length} participant(s)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Début :{" "}
                        {new Date(g.start_time).toLocaleDateString("fr-FR")}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Fin : {new Date(g.end_time).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Participants
                      </p>
                      {g.users.length === 0 ? (
                        <p className="text-xs text-gray-500">Aucun participant pour le moment</p>
                      ) : (
                        <ul className="space-y-2">
                          {g.users.map((u) => {
                            const name =
                              [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
                              "Client";
                            const lineTotal = g.price_by_one * u.quantity;
                            return (
                              <li
                                key={`${g.id}-${u.userId}`}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm bg-white rounded-lg px-3 py-2 border border-gray-100"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{name}</p>
                                  {(u.email || u.phone) && (
                                    <p className="text-xs text-gray-500 truncate">
                                      {[u.email, u.phone].filter(Boolean).join(" · ")}
                                    </p>
                                  )}
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                  <p className="font-semibold text-teal-700">
                                    {u.quantity} unité{u.quantity > 1 ? "s" : ""}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {lineTotal.toFixed(2)} DA
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
