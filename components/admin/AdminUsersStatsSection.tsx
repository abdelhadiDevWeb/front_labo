"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Loader2,
  Package,
  Search,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  AdminStatsUserSummary,
  AdminUserStatistics,
  StatsPeriod,
  getAdminUserStatistics,
  getAdminUsersForStatistics,
} from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PERIODS: Array<{ id: StatsPeriod; label: string }> = [
  { id: "1m", label: "Ce mois" },
  { id: "3m", label: "3 mois" },
  { id: "6m", label: "6 mois" },
  { id: "1y", label: "1 an" },
];

const STATUS_LABELS: Record<string, string> = {
  "en attente": "En attente",
  refusée: "Refusée",
  "en cours": "En cours",
  "on route": "En livraison",
  arrived: "Livrée",
};

const formatMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
};

const displayName = (u: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}) => {
  if (u.name?.trim()) return u.name.trim();
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || u.email || "Utilisateur";
};

type RoleFilter = "all" | "client" | "supplier";

export default function AdminUsersStatsSection() {
  const [users, setUsers] = useState<AdminStatsUserSummary[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [roleCounts, setRoleCounts] = useState<{ client: number; supplier: number }>({
    client: 0,
    supplier: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<StatsPeriod>("1y");
  const [detail, setDetail] = useState<AdminUserStatistics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getAdminUsersForStatistics({
        role: roleFilter,
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });
      if (cancelled) return;
      if (result.success && result.data) {
        setUsers(result.data.users);
        setTotalPages(result.data.pagination.totalPages);
        setTotalCount(result.data.pagination.totalCount);
        setRoleCounts({
          client: result.data.filters.roleCounts.client || 0,
          supplier: result.data.filters.roleCounts.supplier || 0,
        });
      } else {
        setUsers([]);
        setError(result.message || "Impossible de charger les utilisateurs");
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [roleFilter, debouncedSearch, page]);

  useEffect(() => {
    if (!selectedUserId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      setDetailError(null);
      const result = await getAdminUserStatistics(selectedUserId, detailPeriod);
      if (cancelled) return;
      if (result.success && result.data) {
        setDetail(result.data);
      } else {
        setDetail(null);
        setDetailError(result.message || "Impossible de charger les statistiques");
      }
      setDetailLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedUserId, detailPeriod]);

  useEffect(() => {
    if (!selectedUserId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedUserId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedUserId]);

  const isSupplierDetail = detail?.user.role === "supplier";
  const monthKeys = useMemo(
    () => Object.keys(detail?.monthlyAmount || {}).sort(),
    [detail]
  );

  const lineConfig = useMemo(() => {
    if (!detail || monthKeys.length === 0) return null;
    return {
      labels: monthKeys.map(formatMonth),
      datasets: [
        {
          label: isSupplierDetail ? "Revenus (DA)" : "Dépenses (DA)",
          data: monthKeys.map((k) => detail.monthlyAmount[k] || 0),
          borderColor: isSupplierDetail ? "#2563eb" : "#059669",
          backgroundColor: isSupplierDetail
            ? "rgba(37, 99, 235, 0.12)"
            : "rgba(5, 150, 105, 0.15)",
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [detail, monthKeys, isSupplierDetail]);

  const barOrdersConfig = useMemo(() => {
    if (!detail || monthKeys.length === 0) return null;
    return {
      labels: monthKeys.map(formatMonth),
      datasets: [
        {
          label: "Commandes",
          data: monthKeys.map((k) => detail.monthlyOrders[k] || 0),
          backgroundColor: isSupplierDetail ? "#3b82f6" : "#0d9488",
          borderRadius: 8,
        },
      ],
    };
  }, [detail, monthKeys, isSupplierDetail]);

  const productsBarConfig = useMemo(() => {
    if (!detail?.topProducts?.length) return null;
    return {
      labels: detail.topProducts.map((p) =>
        p.name.length > 28 ? `${p.name.slice(0, 28)}…` : p.name
      ),
      datasets: [
        {
          label: "Montant (DA)",
          data: detail.topProducts.map((p) => p.amount),
          backgroundColor: "#10b981",
          borderRadius: 8,
        },
      ],
    };
  }, [detail]);

  const partnersBarConfig = useMemo(() => {
    if (!detail?.topPartners?.length) return null;
    return {
      labels: detail.topPartners.map((p) => {
        const name = displayName(p.partner);
        return name.length > 22 ? `${name.slice(0, 22)}…` : name;
      }),
      datasets: [
        {
          label: "Montant (DA)",
          data: detail.topPartners.map((p) => p.totalAmount),
          backgroundColor: "#8b5cf6",
          borderRadius: 8,
        },
      ],
    };
  }, [detail]);

  const statusDoughnutConfig = useMemo(() => {
    if (!detail) return null;
    const entries = Object.entries(detail.ordersByStatus).filter(([, n]) => n > 0);
    if (!entries.length) return null;
    return {
      labels: entries.map(([k]) => STATUS_LABELS[k] || k),
      datasets: [
        {
          data: entries.map(([, n]) => n),
          backgroundColor: ["#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#10b981"],
        },
      ],
    };
  }, [detail]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Statistiques par utilisateur
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Laboratoires et fournisseurs — ouvrez les graphiques détaillés de chacun.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
              {(
                [
                  { id: "all", label: `Tous (${roleCounts.client + roleCounts.supplier})` },
                  { id: "client", label: `Labos (${roleCounts.client})` },
                  { id: "supplier", label: `Fournisseurs (${roleCounts.supplier})` },
                ] as Array<{ id: RoleFilter; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRoleFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    roleFilter === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher nom, email…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 text-center py-8">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {debouncedSearch
              ? "Aucun utilisateur ne correspond à cette recherche."
              : "Aucun utilisateur trouvé."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Utilisateur</th>
                    <th className="px-4 py-3 font-semibold">Rôle</th>
                    <th className="px-4 py-3 font-semibold">Commandes</th>
                    <th className="px-4 py-3 font-semibold">Montant</th>
                    <th className="px-4 py-3 font-semibold">Dernière</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{displayName(user)}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[240px]">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === "supplier"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {user.role === "supplier" ? (
                            <Store className="w-3 h-3" />
                          ) : (
                            <Building2 className="w-3 h-3" />
                          )}
                          {user.role === "supplier" ? "Fournisseur" : "Laboratoire"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800">{user.ordersCount}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">
                        {user.totalAmount.toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{" "}
                        DA
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {user.lastOrderAt
                          ? new Date(user.lastOrderAt).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Statistiques
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  {totalCount} utilisateur{totalCount > 1 ? "s" : ""} — page {page}/{totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:bg-gray-50"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {mounted &&
        selectedUserId &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
            onClick={() => setSelectedUserId(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Statistiques utilisateur"
          >
            <div
              className="bg-white w-full max-w-5xl h-[min(92dvh,920px)] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0 text-white">
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    {detail?.user.role === "supplier"
                      ? "Statistiques fournisseur"
                      : "Statistiques laboratoire"}
                  </p>
                  <h3 className="text-lg sm:text-xl font-bold truncate">
                    {detail ? displayName(detail.user) : "Chargement…"}
                  </h3>
                  {detail?.user.email && (
                    <p className="text-sm text-blue-50/90 truncate">{detail.user.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 hover:bg-white/15"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 sm:px-6 py-3 bg-gray-50">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDetailPeriod(p.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      detailPeriod === p.id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                {detail?.periodRangeLabel && (
                  <span className="ml-auto text-xs text-gray-500">{detail.periodRangeLabel}</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {detailLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : detailError ? (
                  <p className="text-center text-sm text-red-600 py-10">{detailError}</p>
                ) : !detail ? (
                  <p className="text-center text-sm text-gray-500 py-10">Aucune donnée.</p>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <div className="flex items-center gap-2 text-blue-800 text-xs font-semibold uppercase mb-1">
                          <DollarSign className="w-4 h-4" />
                          {isSupplierDetail ? "Revenus" : "Dépenses"}
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          {detail.totalAmount.toLocaleString("fr-FR", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          DA
                        </p>
                      </div>
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                        <div className="flex items-center gap-2 text-indigo-800 text-xs font-semibold uppercase mb-1">
                          <ShoppingBag className="w-4 h-4" /> Commandes
                        </div>
                        <p className="text-2xl font-bold text-indigo-900">
                          {detail.totalOrders}
                        </p>
                      </div>
                      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                        <div className="flex items-center gap-2 text-cyan-800 text-xs font-semibold uppercase mb-1">
                          <Package className="w-4 h-4" /> Articles
                        </div>
                        <p className="text-2xl font-bold text-cyan-900">{detail.totalItems}</p>
                      </div>
                      <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                        <div className="flex items-center gap-2 text-violet-800 text-xs font-semibold uppercase mb-1">
                          <Users className="w-4 h-4" />
                          {isSupplierDetail ? "Clients" : "Fournisseurs"}
                        </div>
                        <p className="text-2xl font-bold text-violet-900">
                          {detail.totalPartners}
                        </p>
                      </div>
                    </div>

                    {detail.comparison && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex flex-wrap gap-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-700">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          Montant vs période préc. :{" "}
                          <strong
                            className={
                              detail.comparison.amountChange >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }
                          >
                            {detail.comparison.amountChange >= 0 ? "+" : ""}
                            {detail.comparison.amountChange.toFixed(1)}%
                          </strong>
                        </span>
                        <span className="text-gray-700">
                          Commandes vs période préc. :{" "}
                          <strong
                            className={
                              detail.comparison.ordersChange >= 0
                                ? "text-emerald-700"
                                : "text-red-600"
                            }
                          >
                            {detail.comparison.ordersChange >= 0 ? "+" : ""}
                            {detail.comparison.ordersChange.toFixed(1)}%
                          </strong>
                        </span>
                      </div>
                    )}

                    {(detail.catalog || detail.subscription) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {detail.catalog && (
                          <div className="rounded-xl border border-gray-200 p-4">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Store className="w-4 h-4 text-indigo-600" /> Catalogue
                            </h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-lg bg-gray-50 py-2">
                                <p className="text-lg font-bold text-gray-900">
                                  {detail.catalog.products}
                                </p>
                                <p className="text-[11px] text-gray-500">Produits</p>
                              </div>
                              <div className="rounded-lg bg-gray-50 py-2">
                                <p className="text-lg font-bold text-gray-900">
                                  {detail.catalog.machines}
                                </p>
                                <p className="text-[11px] text-gray-500">Machines</p>
                              </div>
                              <div className="rounded-lg bg-gray-50 py-2">
                                <p className="text-lg font-bold text-gray-900">
                                  {detail.catalog.services}
                                </p>
                                <p className="text-[11px] text-gray-500">Services</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {detail.subscription && (
                          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                            <h4 className="font-semibold text-amber-900 mb-1">Abonnement actif</h4>
                            <p className="text-sm text-amber-800">
                              <strong>{detail.subscription.type}</strong> —{" "}
                              {detail.subscription.price.toLocaleString("fr-FR")} DA
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              {new Date(detail.subscription.start).toLocaleDateString("fr-FR")} →{" "}
                              {new Date(detail.subscription.end).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {detail.totalOrders === 0 ? (
                      <p className="text-center text-sm text-gray-500 py-6">
                        Aucune commande sur cette période.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {lineConfig && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-600" />
                                {isSupplierDetail
                                  ? "Évolution des revenus"
                                  : "Évolution des dépenses"}
                              </h4>
                              <div className="h-64">
                                <Line
                                  data={lineConfig}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {barOrdersConfig && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold text-gray-900 mb-3">
                                Commandes par mois
                              </h4>
                              <div className="h-64">
                                <Bar
                                  data={barOrdersConfig}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {productsBarConfig && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold text-gray-900 mb-3">
                                {isSupplierDetail
                                  ? "Articles les plus vendus"
                                  : "Articles les plus achetés"}
                              </h4>
                              <div className="h-72">
                                <Bar
                                  data={productsBarConfig}
                                  options={{
                                    indexAxis: "y" as const,
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {statusDoughnutConfig && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4">
                              <h4 className="font-semibold text-gray-900 mb-3">
                                Répartition des statuts
                              </h4>
                              <div className="h-64 flex items-center justify-center">
                                <Doughnut
                                  data={statusDoughnutConfig}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: "bottom" } },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {partnersBarConfig && (
                            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
                              <h4 className="font-semibold text-gray-900 mb-3">
                                {isSupplierDetail
                                  ? "Top clients (laboratoires)"
                                  : "Top fournisseurs"}
                              </h4>
                              <div className="h-72">
                                <Bar
                                  data={partnersBarConfig}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {detail.recentOrders.length > 0 && (
                          <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                              <h4 className="font-semibold text-gray-900">Commandes récentes</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="text-left text-xs uppercase text-gray-500">
                                  <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">
                                      {isSupplierDetail ? "Client" : "Fournisseur"}
                                    </th>
                                    <th className="px-4 py-2">Statut</th>
                                    <th className="px-4 py-2">Articles</th>
                                    <th className="px-4 py-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {detail.recentOrders.map((o) => (
                                    <tr key={o.id}>
                                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                                        {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                                      </td>
                                      <td className="px-4 py-2 text-gray-700">{o.partnerName}</td>
                                      <td className="px-4 py-2 text-gray-700">
                                        {STATUS_LABELS[o.status] || o.status}
                                      </td>
                                      <td className="px-4 py-2 text-gray-700">{o.itemsCount}</td>
                                      <td className="px-4 py-2 font-semibold text-blue-700">
                                        {o.total.toLocaleString("fr-FR", {
                                          maximumFractionDigits: 2,
                                        })}{" "}
                                        DA
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
