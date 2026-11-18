"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Download,
  Loader2,
  Search,
  Users,
  X,
  Eye,
  ShoppingBag,
  Package,
  DollarSign,
  Check,
} from "lucide-react";
import {
  ClientData,
  StatsPeriod,
  SupplierBuyerStatistics,
  SupplierBuyerSummary,
  getSupplierBuyerStatistics,
  getSupplierBuyers,
} from "@/lib/api";
import { downloadSupplierBuyerStatisticsPdf } from "@/lib/supplier-buyer-statistics-pdf";
import { collectPdfCharts } from "@/lib/pdf-report-charts";
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

const buyerName = (b: { firstName?: string; lastName?: string; email?: string }) => {
  const name = [b.firstName, b.lastName].filter(Boolean).join(" ").trim();
  return name || b.email || "Client";
};

export default function SupplierBuyersStatsSection({
  profile,
}: {
  profile: ClientData | null;
}) {
  const [buyers, setBuyers] = useState<SupplierBuyerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [error, setError] = useState<string | null>(null);

  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<StatsPeriod>("1y");
  const [detail, setDetail] = useState<SupplierBuyerStatistics | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getSupplierBuyers(debouncedSearch || undefined);
      if (cancelled) return;
      if (result.success && result.data) {
        setBuyers(result.data.buyers);
      } else {
        setBuyers([]);
        setError(result.message || "Impossible de charger les clients");
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (!selectedBuyerId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      setDetailError(null);
      const result = await getSupplierBuyerStatistics(selectedBuyerId, detailPeriod);
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
  }, [selectedBuyerId, detailPeriod]);

  useEffect(() => {
    if (!selectedBuyerId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedBuyerId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedBuyerId]);

  const monthKeys = useMemo(
    () => Object.keys(detail?.monthlySpend || {}).sort(),
    [detail]
  );

  const lineConfig = useMemo(() => {
    if (!detail || monthKeys.length === 0) return null;
    return {
      labels: monthKeys.map(formatMonth),
      datasets: [
        {
          label: "Dépenses (DA)",
          data: monthKeys.map((k) => detail.monthlySpend[k] || 0),
          borderColor: "#059669",
          backgroundColor: "rgba(5, 150, 105, 0.15)",
          fill: true,
          tension: 0.35,
        },
      ],
    };
  }, [detail, monthKeys]);

  const barOrdersConfig = useMemo(() => {
    if (!detail || monthKeys.length === 0) return null;
    return {
      labels: monthKeys.map(formatMonth),
      datasets: [
        {
          label: "Réserves",
          data: monthKeys.map((k) => detail.monthlyOrders[k] || 0),
          backgroundColor: "#0d9488",
          borderRadius: 8,
        },
      ],
    };
  }, [detail, monthKeys]);

  const productsBarConfig = useMemo(() => {
    if (!detail?.topProducts?.length) return null;
    return {
      labels: detail.topProducts.map((p) =>
        p.name.length > 28 ? `${p.name.slice(0, 28)}…` : p.name
      ),
      datasets: [
        {
          label: "Montant (DA)",
          data: detail.topProducts.map((p) => p.revenue),
          backgroundColor: "#10b981",
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

  const handleDownloadPdf = () => {
    if (!detail || pdfBusy) return;
    setPdfBusy(true);
    setPdfDone(false);
    try {
      downloadSupplierBuyerStatisticsPdf({
        statistics: detail,
        profile,
        charts: collectPdfCharts(detailRef.current),
      });
      setPdfDone(true);
      window.setTimeout(() => setPdfDone(false), 2000);
    } catch (err) {
      console.error("Buyer PDF export error:", err);
      setDetailError("Impossible de générer le PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <div className="border-b border-gray-100 bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Clients ayant acheté chez vous
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Recherchez un laboratoire, puis ouvrez ses statistiques détaillées (graphiques + PDF).
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 text-center py-8">{error}</p>
        ) : buyers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {debouncedSearch
              ? "Aucun client ne correspond à cette recherche."
              : "Aucun client n’a encore acheté chez vous."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Réserves</th>
                  <th className="px-4 py-3 font-semibold">Articles</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Dernière</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-teal-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{buyerName(buyer)}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[220px]">
                        {buyer.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{buyer.ordersCount}</td>
                    <td className="px-4 py-3 text-gray-800">{buyer.productsCount}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {buyer.totalSpent.toFixed(2)} DA
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {buyer.lastOrderAt
                        ? new Date(buyer.lastOrderAt).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedBuyerId(buyer.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
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
        )}
      </div>

      {mounted &&
        selectedBuyerId &&
        createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
          onClick={() => setSelectedBuyerId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Statistiques client"
        >
          <div
            className="bg-white w-full max-w-5xl h-[min(92dvh,920px)] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-gray-100 bg-gradient-to-r from-teal-600 to-emerald-600 px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0 text-white">
                <p className="text-xs uppercase tracking-wide text-teal-100">Statistiques client</p>
                <h3 className="text-lg sm:text-xl font-bold truncate">
                  {detail ? buyerName(detail.buyer) : "Chargement…"}
                </h3>
                {detail?.buyer.email && (
                  <p className="text-sm text-teal-50/90 truncate">{detail.buyer.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedBuyerId(null)}
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
                      ? "bg-teal-600 text-white"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-teal-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!detail || detail.totalOrders === 0 || pdfBusy || detailLoading}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {pdfBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : pdfDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {pdfBusy ? "PDF…" : pdfDone ? "Téléchargé" : "Télécharger PDF"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6" ref={detailRef}>
              {detailLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
              ) : detailError ? (
                <p className="text-center text-sm text-red-600 py-10">{detailError}</p>
              ) : !detail || detail.totalOrders === 0 ? (
                <p className="text-center text-sm text-gray-500 py-10">
                  Aucune réserve sur cette période.
                </p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold uppercase mb-1">
                        <DollarSign className="w-4 h-4" /> Total dépensé
                      </div>
                      <p className="text-2xl font-bold text-emerald-900">
                        {detail.totalSpent.toFixed(2)} DA
                      </p>
                    </div>
                    <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                      <div className="flex items-center gap-2 text-teal-800 text-xs font-semibold uppercase mb-1">
                        <ShoppingBag className="w-4 h-4" /> Réserves
                      </div>
                      <p className="text-2xl font-bold text-teal-900">{detail.totalOrders}</p>
                    </div>
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                      <div className="flex items-center gap-2 text-cyan-800 text-xs font-semibold uppercase mb-1">
                        <Package className="w-4 h-4" /> Articles
                      </div>
                      <p className="text-2xl font-bold text-cyan-900">
                        {detail.totalItemsBought}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {lineConfig && (
                      <div className="rounded-xl border border-gray-200 bg-white p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          Évolution des dépenses
                        </h4>
                        <div className="h-64" data-pdf-chart="Évolution des dépenses">
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
                        <h4 className="font-semibold text-gray-900 mb-3">Réserves par mois</h4>
                        <div className="h-64" data-pdf-chart="Réserves par mois">
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
                          Articles les plus achetés
                        </h4>
                        <div className="h-72" data-pdf-chart="Articles les plus achetés">
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
                        <h4 className="font-semibold text-gray-900 mb-3">Répartition des statuts</h4>
                        <div
                          className="h-64 flex items-center justify-center"
                          data-pdf-chart="Répartition des statuts"
                        >
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
                  </div>

                  {detail.recentOrders.length > 0 && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                        <h4 className="font-semibold text-gray-900">Réserves récentes</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-xs uppercase text-gray-500">
                            <tr>
                              <th className="px-4 py-2">Date</th>
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
                                <td className="px-4 py-2 text-gray-700">
                                  {STATUS_LABELS[o.status] || o.status}
                                </td>
                                <td className="px-4 py-2 text-gray-700">{o.itemsCount}</td>
                                <td className="px-4 py-2 font-semibold text-emerald-700">
                                  {o.total.toFixed(2)} DA
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
