"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  BarChart3,
  Building2,
  Calendar,
  Check,
  Download,
  FileText,
  Loader2,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import {
  ClientData,
  ClientStatsPeriod,
  DetailedClientStatistics,
  getClientDetailedStatistics,
  getProfile,
  getSessionRole,
} from "@/lib/api";
import { downloadLabStatisticsPdf } from "@/lib/lab-statistics-pdf";
import AppLoadingScreen from "@/components/AppLoadingScreen";

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

const STATUS_LABELS: Record<string, string> = {
  "en attente": "En attente",
  refusée: "Refusée",
  "en cours": "En cours",
  "on route": "En livraison",
  arrived: "Livrée",
};

const PERIODS: Array<{
  id: ClientStatsPeriod;
  label: string;
  hint: string;
}> = [
  { id: "1m", label: "Ce mois", hint: "Mois en cours" },
  { id: "3m", label: "3 mois", hint: "Trimestre glissant" },
  { id: "6m", label: "6 mois", hint: "Semestre glissant" },
  { id: "1y", label: "1 an", hint: "Année glissante" },
];

const formatDA = (n: number) =>
  `${Math.round(n).toLocaleString("fr-DZ")} DA`;

const formatMonth = (monthKey: string) => {
  const [year, month] = monthKey.split("-");
  return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1).toLocaleDateString(
    "fr-FR",
    { month: "short", year: "numeric" }
  );
};

const formatDay = (dateKey: string) => {
  const [, , day] = dateKey.split("-");
  return day;
};

export default function LabStatisticsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<ClientData | null>(null);
  const [statistics, setStatistics] = useState<DetailedClientStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<ClientStatsPeriod>("1m");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [pdfPressed, setPdfPressed] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    const gate = async () => {
      const session = await getSessionRole();
      if (!session || session.role !== "client") {
        router.replace(session ? "/home" : "/login?next=/statistics");
        return;
      }
      const profileRes = await getProfile();
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      setAuthReady(true);
    };
    void gate();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getClientDetailedStatistics(selectedPeriod);
      if (cancelled) return;
      if (result.success && result.data) {
        setStatistics(result.data);
      } else {
        setError(result.message || "Impossible de charger les statistiques");
        setStatistics(null);
      }
      setIsLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authReady, selectedPeriod]);

  const chartOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          padding: 10,
          cornerRadius: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
        y: {
          grid: { color: "rgba(148, 163, 184, 0.2)" },
          ticks: { color: "#64748b" },
          beginAtZero: true,
        },
      },
    }),
    []
  );

  const monthlyLine = useMemo(() => {
    if (!statistics?.monthlySpend) return null;
    const entries = Object.entries(statistics.monthlySpend).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return {
      labels: entries.map(([k]) => formatMonth(k)),
      datasets: [
        {
          label: "Dépenses (DA)",
          data: entries.map(([, v]) => v),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.15)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#06b6d4",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    };
  }, [statistics]);

  const dailyBar = useMemo(() => {
    if (!statistics?.dailySpend) return null;
    const entries = Object.entries(statistics.dailySpend).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return {
      labels: entries.map(([k]) => formatDay(k)),
      datasets: [
        {
          label: "Dépenses (DA)",
          data: entries.map(([, v]) => v),
          backgroundColor: "rgba(6, 182, 212, 0.75)",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [statistics]);

  const productsBar = useMemo(() => {
    if (!statistics?.topProducts?.length) return null;
    const top = statistics.topProducts.slice(0, 6);
    return {
      labels: top.map((p) =>
        p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name
      ),
      datasets: [
        {
          label: "Quantité achetée",
          data: top.map((p) => p.quantity),
          backgroundColor: [
            "rgba(37, 99, 235, 0.85)",
            "rgba(6, 182, 212, 0.85)",
            "rgba(16, 185, 129, 0.85)",
            "rgba(139, 92, 246, 0.85)",
            "rgba(245, 158, 11, 0.85)",
            "rgba(244, 63, 94, 0.85)",
          ],
          borderRadius: 8,
        },
      ],
    };
  }, [statistics]);

  const statusDoughnut = useMemo(() => {
    if (!statistics?.ordersByStatus) return null;
    const keys = Object.keys(STATUS_LABELS);
    return {
      labels: keys.map((k) => STATUS_LABELS[k]),
      datasets: [
        {
          data: keys.map(
            (k) => statistics.ordersByStatus[k as keyof typeof statistics.ordersByStatus] || 0
          ),
          backgroundColor: [
            "rgba(245, 158, 11, 0.85)",
            "rgba(239, 68, 68, 0.85)",
            "rgba(59, 130, 246, 0.85)",
            "rgba(99, 102, 241, 0.85)",
            "rgba(16, 185, 129, 0.85)",
          ],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [statistics]);

  const handleDownloadPdf = async () => {
    if (!statistics || statistics.totalOrders === 0 || pdfBusy) return;
    setPdfPressed(true);
    setPdfBusy(true);
    setPdfDone(false);
    setPdfError(null);
    try {
      await downloadLabStatisticsPdf({ statistics, profile });
      setPdfDone(true);
      window.setTimeout(() => setPdfDone(false), 2200);
    } catch (err) {
      console.error("PDF export error:", err);
      setPdfError("Impossible de générer le PDF. Réessayez.");
    } finally {
      setPdfBusy(false);
      window.setTimeout(() => setPdfPressed(false), 180);
    }
  };

  const pdfLabel = pdfBusy
    ? "Génération…"
    : pdfDone
      ? "Téléchargé"
      : "PDF";
  const pdfCtaLabel = pdfBusy
    ? "Génération…"
    : pdfDone
      ? "Téléchargé !"
      : "Télécharger le PDF";

  if (!authReady) {
    return <AppLoadingScreen />;
  }

  const cmp = statistics?.comparison;
  const spendUp = (cmp?.spendChange || 0) >= 0;
  const ordersUp = (cmp?.ordersChange || 0) >= 0;
  const periodMeta = PERIODS.find((p) => p.id === selectedPeriod);
  const showDaily = selectedPeriod === "1m";
  const canExport = Boolean(statistics && statistics.totalOrders > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50/40 overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BackButton fallbackHref="/home" />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide mb-0.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Laboratoire
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                Mes statistiques
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onPointerDown={() => {
                if (canExport && !pdfBusy && !isLoading) setPdfPressed(true);
              }}
              onPointerUp={() => setPdfPressed(false)}
              onPointerLeave={() => {
                if (!pdfBusy) setPdfPressed(false);
              }}
              onClick={() => void handleDownloadPdf()}
              disabled={!canExport || pdfBusy || isLoading}
              aria-busy={pdfBusy}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 sm:px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                pdfDone
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 scale-[0.98]"
                  : pdfPressed || pdfBusy
                    ? "border-blue-400 bg-blue-100 text-blue-900 scale-[0.94] shadow-inner"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-blue-200 hover:shadow-md active:scale-[0.94] active:bg-blue-50 active:border-blue-300 active:shadow-inner"
              }`}
              title={
                canExport
                  ? "Télécharger le rapport PDF"
                  : "Aucune donnée à exporter"
              }
            >
              {pdfBusy ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : pdfDone ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Download className="w-4 h-4 text-blue-600" />
              )}
              <span className="hidden sm:inline">{pdfLabel}</span>
            </button>
            <Link
              href="/orders"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-cyan-700"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Mes réserves</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 max-w-7xl space-y-5 sm:space-y-8">
        {/* Period selector */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Période d&apos;analyse
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                {statistics?.periodRangeLabel ||
                  periodMeta?.hint ||
                  "Choisissez une période"}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <FileText className="w-3.5 h-3.5" />
              Rapport PDF professionnel disponible
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Période"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 rounded-2xl bg-slate-100/90"
          >
            {PERIODS.map((p) => {
              const active = selectedPeriod === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`relative rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                    active
                      ? "bg-white text-slate-900 shadow-md ring-1 ring-blue-100"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${
                      active ? "text-blue-700" : ""
                    }`}
                  >
                    {p.label}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {p.hint}
                  </span>
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
          {pdfError ? (
            <p className="mt-3 text-sm text-rose-600">{pdfError}</p>
          ) : null}
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-sm">Chargement de vos données…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
            {error}
          </div>
        ) : !statistics || statistics.totalOrders === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 sm:p-14 text-center animate-fade-in-up">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune réserve sur cette période
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
              Essayez une autre période, ou passez des réserves pour voir vos
              graphiques et classements ici.
            </p>
            <Link
              href="/allthings"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-white font-semibold hover:bg-blue-700"
            >
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  label: "Dépenses période",
                  value: formatDA(statistics.totalSpent),
                  icon: Wallet,
                  tone: "from-blue-600 to-cyan-500",
                  delay: "animation-delay-100",
                },
                {
                  label: "Réserves",
                  value: String(statistics.totalOrders),
                  icon: ShoppingBag,
                  tone: "from-indigo-600 to-blue-500",
                  delay: "animation-delay-200",
                },
                {
                  label: "Articles achetés",
                  value: String(statistics.totalItemsBought),
                  icon: Package,
                  tone: "from-emerald-600 to-teal-500",
                  delay: "animation-delay-300",
                },
                {
                  label: "Fournisseurs",
                  value: String(statistics.totalSuppliers),
                  icon: Building2,
                  tone: "from-violet-600 to-fuchsia-500",
                  delay: "animation-delay-400",
                },
              ].map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div
                    key={kpi.label}
                    className={`relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm animate-fade-in-up ${kpi.delay}`}
                  >
                    <div
                      className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${kpi.tone} text-white shadow-md`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">{kpi.label}</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 truncate">
                      {kpi.value}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Period comparison */}
            {cmp && (
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 animate-fade-in-up animation-delay-500">
                <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Dépenses (période)</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatDA(cmp.currentMonthSpend)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      vs {formatDA(cmp.previousMonthSpend)} période précédente
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      spendUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {spendUp ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(cmp.spendChange).toFixed(0)}%
                  </span>
                </div>
                <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Réserves (période)</p>
                    <p className="text-xl font-bold text-gray-900">{cmp.currentMonthOrders}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      vs {cmp.previousMonthOrders} période précédente
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ordersUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {ordersUp ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(cmp.ordersChange).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Charts row */}
            <div className="grid lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="lg:col-span-3 rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm animate-fade-in-up animation-delay-600">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Dépenses {statistics.periodLabel ? `— ${statistics.periodLabel}` : ""}
                  </h2>
                </div>
                <div className="h-56 sm:h-72">
                  {monthlyLine ? (
                    <Line data={monthlyLine} options={chartOpts} />
                  ) : (
                    <p className="text-sm text-gray-500">Pas assez de données</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm animate-fade-in-up animation-delay-700">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  Statut des réserves
                </h2>
                <div className="h-56 sm:h-72 flex items-center justify-center">
                  {statusDoughnut ? (
                    <Doughnut
                      data={statusDoughnut}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: { boxWidth: 10, font: { size: 11 } },
                          },
                        },
                        cutout: "62%",
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Daily spend — most useful for current month */}
            {showDaily ? (
              <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm animate-fade-in-up animation-delay-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Dépenses journalières
                    {statistics.dailySpendMonth ? (
                      <span className="text-sm font-medium text-gray-500">
                        — {statistics.dailySpendMonth}
                      </span>
                    ) : null}
                  </h2>
                </div>
                <div className="h-52 sm:h-64">
                  {dailyBar ? <Bar data={dailyBar} options={chartOpts} /> : null}
                </div>
              </div>
            ) : null}

            {/* Top products + suppliers */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm animate-fade-in-up">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Produits les plus achetés
                </h2>
                <div className="h-56 sm:h-64 mb-4">
                  {productsBar ? (
                    <Bar
                      data={productsBar}
                      options={{
                        ...chartOpts,
                        indexAxis: "y" as const,
                        scales: {
                          ...chartOpts.scales,
                          x: { ...chartOpts.scales?.x, beginAtZero: true },
                        },
                      }}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">Aucun produit</p>
                  )}
                </div>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {statistics.topProducts.slice(0, 5).map((p, i) => (
                    <li
                      key={`${p.name}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-gray-800 truncate">
                        <span className="text-blue-600 mr-1.5">#{i + 1}</span>
                        {p.name}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {p.quantity} × · {formatDA(p.spent)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 shadow-sm animate-fade-in-up">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-600" />
                  Fournisseurs préférés
                </h2>
                <ul className="space-y-3">
                  {statistics.topSuppliers.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun fournisseur</p>
                  ) : (
                    statistics.topSuppliers.map((row, i) => {
                      const name =
                        [row.supplier.firstName, row.supplier.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        row.supplier.email ||
                        "Fournisseur";
                      const max = statistics.topSuppliers[0]?.totalSpent || 1;
                      const pct = Math.round((row.totalSpent / max) * 100);
                      return (
                        <li key={row.supplier._id || i} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <Link
                              href={`/supplier/${row.supplier._id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 truncate"
                            >
                              #{i + 1} {name}
                            </Link>
                            <span className="shrink-0 text-gray-600 font-medium">
                              {formatDA(row.totalSpent)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            {row.ordersCount} réserve{row.ordersCount > 1 ? "s" : ""} ·{" "}
                            {row.itemsCount} article{row.itemsCount > 1 ? "s" : ""}
                          </p>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            </div>

            {/* Export CTA */}
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Exporter le rapport comptable
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  PDF structuré : synthèse, comparaison, mensuel, produits et
                  fournisseurs — période « {periodMeta?.label} ».
                </p>
              </div>
              <button
                type="button"
                onPointerDown={() => {
                  if (!pdfBusy) setPdfPressed(true);
                }}
                onPointerUp={() => setPdfPressed(false)}
                onPointerLeave={() => {
                  if (!pdfBusy) setPdfPressed(false);
                }}
                onClick={() => void handleDownloadPdf()}
                disabled={pdfBusy}
                aria-busy={pdfBusy}
                className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                  pdfDone
                    ? "bg-emerald-600 scale-[0.98]"
                    : pdfPressed || pdfBusy
                      ? "bg-slate-950 scale-[0.94] shadow-inner"
                      : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg active:scale-[0.94] active:bg-slate-950 active:shadow-inner"
                }`}
              >
                {pdfBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pdfDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {pdfCtaLabel}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
